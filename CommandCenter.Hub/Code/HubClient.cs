using System;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using CommandCenter.Hub.Enums;

namespace CommandCenter.Hub.Code
{
    public class HubClient
    {
        public string ClientId { get; set; }
        public string ClientName { get; set; }
        public ClientType ClientType { get; set; }
        public bool Registered { get; set; }
        public WebSocket Socket { get; private set; }

        public WebSocketState SocketState =>
            (Socket?.State).GetValueOrDefault(WebSocketState.None);

        public HubClient() { }

        public HubClient(string clientId, string clientName, ClientType clientType)
        {
            ClientId = clientId;
            ClientName = clientName;
            ClientType = clientType;
        }

        public async Task CloseSocket(WebSocketCloseStatus closeStatus, string statusDescription, CancellationToken cancellationToken)
        {
            if (Socket != null)
            {
                try
                {
                    if (Socket.State == WebSocketState.Open)
                        await Socket.CloseAsync(closeStatus, statusDescription, cancellationToken);
                }
                catch { }


                Socket.Dispose();
            }
        }

        public async Task SetSocket(WebSocket socket)
        {
            if (Equals(socket, Socket))
                return;

            await CloseSocket(WebSocketCloseStatus.NormalClosure, "Closed by the ClientManager", CancellationToken.None);

            Socket = socket;
        }
    }
}