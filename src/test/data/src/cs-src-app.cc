/**
* \file cs-src-app.h
*
* \author Tobias Waurick
* \date 12.07.17
*
*/
#include <iostream>
#include <fstream>
#include <algorithm>
#include "cs-src-app.h"
#include "assert.h"
#include "ns3/log.h"

NS_LOG_COMPONENT_DEFINE("CsSrcApp");
NS_OBJECT_ENSURE_REGISTERED(CsSrcApp);

TypeId
CsSrcApp::GetTypeId(void)
{
	static TypeId tid = TypeId("CsSrcApp")
							.SetParent<Application>()
							.SetGroupName("CompressedSensing")
							.AddConstructor<CsSrcApp>()
							.AddAttribute("PktInterval",
										  "The time to wait between packets",
										  TimeValue(MilliSeconds(0)),
										  MakeTimeAccessor(&CsSrcApp::m_pktInterval),
										  MakeTimeChecker(Seconds(0)))
							.AddAttribute("MeasInterval",
										  "Measurment sequence interval",
										  TimeValue(MilliSeconds(1000)),
										  MakeTimeAccessor(&CsSrcApp::m_measInterval),
										  MakeTimeChecker(Seconds(0)))
							.AddAttribute("n", "Length of original measurement vector",
										  UintegerValue(256),
										  MakeUintegerAccessor(&CsSrcApp::m_n),
										  MakeUintegerChecker<uint32_t>())
							.AddAttribute("m", "Length of compressed vector",
										  UintegerValue(128),
										  MakeUintegerAccessor(&CsSrcApp::m_m),
										  MakeUintegerChecker<uint32_t>())
							.AddAttribute("ComprTemp", "Temporal Compressor",
										  PointerValue(),
										  MakePointerAccessor(&CsSrcApp::SetTempCompressor, &CsSrcApp::GetTempCompressor),
										  MakePointerChecker<CompressorTemp>())
							.AddAttribute("NoiseVar", "Variance of artificial noise",
										  DoubleValue(0),
										  MakeDoubleAccessor(&CsSrcApp::m_noiseVar),
										  MakeDoubleChecker<double>(0.0))
							.AddAttribute("TxProb", "Probability to send",
										  DoubleValue(1.0),
										  MakeDoubleAccessor(&CsSrcApp::m_txProb),
										  MakeDoubleChecker<double>(0.0, 1.0))
							.AddAttribute("RanTx", "The random variable attached to determine when to send.",
										  TypeId::ATTR_GET | TypeId::ATTR_CONSTRUCT,
										  StringValue("ns3::UniformRandomVariable[Min=0.0|Max=1.0]"),
										  MakePointerAccessor(&CsSrcApp::m_ranTx),
										  MakePointerChecker<RandomVariableStream>())
							.AddTraceSource("Tx", "A new packet is sent",
											MakeTraceSourceAccessor(&CsSrcApp::m_txTrace),
											"ns3::Packet::TracedCallback")
							.AddTraceSource("Drop", "A packet is dropped",
											MakeTraceSourceAccessor(&CsSrcApp::m_dropTrace),
											"ns3::Packet::TracedCallback");
	return tid;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

CsSrcApp::CsSrcApp() : m_yTemp(0), m_n(0), m_m(0), m_sent(0),
					   m_nodeId(0), m_clusterId(0), m_nextSeq(0),
					   m_running(false), m_isSetup(false), m_seed(1),
					   m_noiseVar(0.0), m_noiseRanVar(CreateObject<NormalRandomVariable>()),
					   m_sendEvent(EventId()), m_schedEvent(EventId()),
					   m_measEvent(EventId())

{
	NS_LOG_FUNCTION(this);
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::Setup(Ptr<CsNode> node, Ptr<SerialDataBuffer<double>> input)
{
	using namespace std;
	NS_LOG_FUNCTION(this << node << input);
	NS_ASSERT_MSG(!m_isSetup, "Setup was already called!");
	NS_ASSERT_MSG(node->IsSource() || node->IsCluster(), "Must be a source or cluster node!");

	m_node = node;
	m_nodeId = node->GetNodeId();
	m_clusterId = node->GetClusterId();

	m_seed = node->GetSeed();

	m_fdata = input;

	//setup compressor
	if (!m_compTemp)
		m_compTemp = CreateObject<CompressorTemp>();
	m_compTemp->Setup(m_seed, m_n, m_m);

	//get streams from node
	m_streamY = m_node->GetStreamByName(CsNode::STREAMNAME_COMPR);
	m_streamX = m_node->GetStreamByName(CsNode::STREAMNAME_UNCOMPR);

	m_isSetup = true;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::ResetIn()
{
	m_fdata->Reset();
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::SetTempCompressor(Ptr<CompressorTemp> comp)
{
	NS_LOG_FUNCTION(this << comp);
	NS_ASSERT_MSG(!m_isSetup, "Setup was already called!");

	if (comp)
	{
		m_compTemp = CopyObject(comp);
		m_compTemp->Setup(m_seed, m_n, m_m);
	}
}

/*-----------------------------------------------------------------------------------------------------------------------*/

Ptr<CompressorTemp> CsSrcApp::GetTempCompressor() const
{
	NS_LOG_FUNCTION(this);
	return m_compTemp;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::SetTxProb(double p)
{
	NS_LOG_FUNCTION(this << p);
	NS_ASSERT_MSG(!m_isSetup, "Setup was already called!");

	m_txProb = p;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::StartApplication()
{
	NS_LOG_FUNCTION(this);

	NS_ASSERT_MSG(m_isSetup, "Run Setup first!");
	NS_ASSERT_MSG(!m_running, "Application already running!");
	m_running = true;

	Measure();
}

void CsSrcApp::StopApplication()
{
	NS_LOG_FUNCTION(this);

	Simulator::Cancel(m_sendEvent);
	Simulator::Cancel(m_schedEvent);
	Simulator::Cancel(m_measEvent);
	m_running = false;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

bool CsSrcApp::CompressNextTemp()
{
	NS_LOG_FUNCTION(this);

	/*--------  Compress next Y  --------*/

	uint32_t remain = m_fdata->GetRemaining();

	if (!m_compTemp)
	{
		NS_LOG_ERROR("Src Node" << int(m_nodeId) << " has no valid compressor attached!");
		return false;
	}
	else if (remain < m_n)
	{
		// NS_LOG_WARN("Not enough samples left in file, sending zeros!");
		// std::fill(yData, yData + m_m, 0);
		NS_LOG_INFO("Src Node" << int(m_nodeId) << " in cluster " << int(m_clusterId) << " has no more samples to compress!");
		return false;
	}

	double *yData = new double[m_m];
	double xData[m_n];
	m_fdata->ReadNext(xData, m_n);
	m_streamX->CreateBuffer(xData, m_n);
	AddAWGN(xData, m_n);
	m_compTemp->Compress(xData, m_n, yData, m_m);

	// write to stream
	m_streamY->CreateBuffer(yData, m_m);

	m_yTemp.MoveMem(yData, m_m);

	return true;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::CreateCsPackets()
{
	NS_LOG_FUNCTION(this);
	/*--------  Create packets from that data  --------*/
	// uint32_t nPacketsNow = 1;
	std::vector<Ptr<Packet>> pktList;

	uint32_t payloadSize = GetMaxPayloadSizeByte();

	CsHeader header;
	header.SetClusterId(m_clusterId);
	header.SetNodeId(m_nodeId);
	header.SetSeq(m_nextSeq);
	header.SetDataSize(payloadSize);
	// double yData[m_m];
	// m_yTemp.ReadNext(yData, m_m);

	// Ptr<Packet> p = Create<Packet>(reinterpret_cast<uint8_t *>(yData), payloadSize);
	Ptr<Packet> p = Create<Packet>(reinterpret_cast<const uint8_t *>(m_yTemp.GetMem()), payloadSize);
	p->AddHeader(header);
	pktList.push_back(p);
	WriteBcPacketList(pktList);
	/*--------  Update members  --------*/
	m_nextSeq++;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::Send(Ptr<Packet> pkt, Ptr<NetDevice> device) const
{
	device->Send(pkt, Address(), 0);
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::WriteBcPacketList(Ptr<Packet> pkt)
{
	NS_LOG_FUNCTION(this);
	m_bcPackets.push_back(pkt);

	//restart transmission if new packets and not already sending
	if (HasBcPackets() && !IsBroadcasting())
	{
		ScheduleBc(MilliSeconds(0.0));
	}
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::WriteBcPacketList(const std::vector<Ptr<Packet>> &pktList)
{
	NS_LOG_FUNCTION(this);
	if (HasBcPackets())
		m_bcPackets.insert(m_bcPackets.end(), pktList.begin(), pktList.end());
	else
		m_bcPackets = pktList;

	//restart transmission if new packets and not already sending
	if (HasBcPackets() && !IsBroadcasting())
	{
		ScheduleBc(MilliSeconds(0.0));
	}
}

/*-----------------------------------------------------------------------------------------------------------------------*/

uint32_t CsSrcApp::GetMaxPayloadSizeByte() const
{
	NS_LOG_FUNCTION(this);

	return GetMaxPayloadSize() * sizeof(T_PktData);
}

/*-----------------------------------------------------------------------------------------------------------------------*/

uint32_t CsSrcApp::GetMaxPayloadSize() const
{
	NS_LOG_FUNCTION(this);

	return m_m;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

bool CsSrcApp::HasBcPackets() const
{
	return !m_bcPackets.empty();
}

/*-----------------------------------------------------------------------------------------------------------------------*/

bool CsSrcApp::IsBroadcasting() const
{
	return m_sendEvent.IsRunning();
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::Broadcast(Ptr<Packet> p)
{
	NS_LOG_FUNCTION(this << p);
	NS_ASSERT(m_sendEvent.IsExpired());

	//send via all net devices
	m_txTrace(p);
	NetDeviceContainer devices = m_node->GetTxDevices();
	for (auto it = devices.Begin(); it != devices.End(); it++)
	{
		Send(p, *it);
	}

	// new tx?
	m_sent++;
	if (HasBcPackets())
	{
		ScheduleBc(m_pktInterval);
	}
}

/*-----------------------------------------------------------------------------------------------------------------------*/

Time CsSrcApp::GetPktInterval() const
{
	return m_pktInterval;
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::ScheduleBc(Time dt)
{
	NS_LOG_FUNCTION(this << dt);
	NS_ASSERT_MSG(HasBcPackets(), "No packets to schedule!");
	NS_ASSERT_MSG(m_sendEvent.IsExpired(), "Already sending!");

	Ptr<Packet> pkt = m_bcPackets.front();
	m_bcPackets.erase(m_bcPackets.begin());

	//schedule send
	if (m_ranTx->GetValue() < m_txProb)
		m_sendEvent = Simulator::Schedule(dt, &CsSrcApp::Broadcast, this, pkt);
	else if (HasBcPackets())
		m_schedEvent = Simulator::Schedule(m_pktInterval, &CsSrcApp::ScheduleBc, this, m_pktInterval);
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::Measure()
{
	NS_LOG_FUNCTION(this);
	if (CompressNextTemp())
	{
		CreateCsPackets();
		m_measEvent = Simulator::Schedule(m_measInterval, &CsSrcApp::Measure, this);
	}
}

/*-----------------------------------------------------------------------------------------------------------------------*/

void CsSrcApp::AddAWGN(double *buffer, uint32_t bufSize)
{
	if(m_noiseVar > 0.0)
	{
		for (uint32_t i = 0; i < bufSize; i++)
			buffer[i] += m_noiseRanVar->GetValue(0.0, m_noiseVar);
	}
}
