namespace test
{
class IShape {
public:
  virtual ~IShape();
  virtual void move_x(distance x) = 0;
  virtual void move_y(distance y) = 0;
  virtual void rotate(angle rotation) = 0;
  //...
};
} // namespace test

