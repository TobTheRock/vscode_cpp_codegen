export interface INameInputProvider {
  getInterfaceName?(origName: string): string | Promise<string>;
}
