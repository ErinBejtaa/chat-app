import "socket.io";

declare module "socket.io" {
  interface SocketData {
    user?: string;
    room?: string;
  }
}
