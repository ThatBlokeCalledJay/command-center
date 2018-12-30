using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CommandCenter.Hub.Extensions;
using CommandCenter.Hub.Models;

namespace CommandCenter.Hub.Code
{
    public class ClientManager
    {
        private readonly ConcurrentDictionary<string, HubClient> _clients = new ConcurrentDictionary<string, HubClient>();

        public HubClient GetClientById(string id)
        {
            return _clients.FirstOrDefault(p => p.Key == id).Value;
        }

        public ConcurrentDictionary<string, HubClient> GetAll()
        {
            return _clients;
        }

        /// <summary>
        /// Attempt to add/register the client on the hub. If a client already exists with the same client id, the new client wont be added.
        /// </summary>
        /// <param name="client"></param>
        public bool TryAddClient(HubClient client)
        {
            return _clients.TryAdd(client.ClientId, client);            
        }

        public async Task RemoveClient(string id)
        {
            _clients.TryRemove(id, out var client);

            await client.CloseSocket(WebSocketCloseStatus.NormalClosure, "Closed by the ClientManager", CancellationToken.None);
        }

        public async Task SendMessageToAll(ActionMessage message)
        {
            foreach (var pair in _clients)
            {
                if (pair.Value.SocketState == WebSocketState.Open)
                    await SendMessage(pair.Value, message);
            }
        }

        public async Task SendMessage(string clientId, ActionMessage message)
        {
            var client = _clients.FirstOrDefault(p => p.Key == clientId).Value;

            if (client != null)
                await SendMessage(client, message);
        }

        private async Task SendMessage(HubClient client, ActionMessage message)
        {
            if (client.SocketState != WebSocketState.Open)
                return;

            var jsonMessage = message.ToJson();

            await SendString(client.Socket, jsonMessage);
        }

        private Task SendString(WebSocket socket, string data, CancellationToken cancellationToken = default(CancellationToken))
        {
            if (socket.State != WebSocketState.Open)
                return Task.CompletedTask;

            var buffer = Encoding.UTF8.GetBytes(data);
            var segment = new ArraySegment<byte>(buffer);
            return socket.SendAsync(segment, WebSocketMessageType.Text, true, cancellationToken);
        }
    }
}
