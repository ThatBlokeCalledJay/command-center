using CommandCenter.Hub.Code;
using CommandCenter.Hub.Enums;
using CommandCenter.Hub.Extensions;
using CommandCenter.Hub.Models;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CommandCenter.Hub.Middleware
{
    public class HubWebSocketMiddleware
    {
        private RequestDelegate _next;
        private readonly ClientManager _clientManager;

        public HubWebSocketMiddleware(RequestDelegate next, ClientManager clientManager)
        {
            _next = next;
            _clientManager = clientManager;
        }

        public async Task Invoke(HttpContext context)
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                await _next.Invoke(context);
                return;
            }

            CancellationToken cancellationToken = context.RequestAborted;

            var socket = await context.WebSockets.AcceptWebSocketAsync();

            await Receive(socket, (result, buffer) => { });

            await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", cancellationToken);
            socket.Dispose();
        }

        //TODO: Create a message manager
        private async Task Receive(WebSocket socket, Action<WebSocketReceiveResult, byte[]> messageHandler)
        {
            HubClient client = null;
            
            while (socket.State == WebSocketState.Open)
            {
                var jsonData = await ReceiveStringAsync(socket, CancellationToken.None);

                if (jsonData == null)
                    return;

                var message = jsonData.FromJson<ControlMessage>();

                client = client ?? _clientManager.GetClientById(message.ClientId);

                //### Example of how registration may take place
                if (message.MessageType == MessageType.Register)
                {
                    var action = message.ToAction<RegisterAction>();
                    
                    client = client ?? new HubClient(message.ClientId, action.ClientName, action.ClientType);
                    await client.SetSocket(socket);

                    _clientManager.TryAddClient(client);
                    
                    if(!string.IsNullOrWhiteSpace(message.MessageId))
                        //### inform the client that registration was successful.
                        await _clientManager.SendMessage(message.ClientId,
                            new ActionMessage
                            {
                                
                                MessageType = MessageType.Registered
                            });
                }

                //### If there isn't a registered client object for this socket
                //### don't continue processing this message
                if(client == null)
                    continue;

                if (message.MessageType == MessageType.MoveCommand)
                {
                    var action = message.ToAction<MoveAction>();

                    await _clientManager.SendMessage(action.ClientId,
                        new ActionMessage
                        {
                            MessageId = message.MessageId,
                            MessageType = MessageType.MoveCommand,
                            Action = action.Axis
                        });
                }

                //### If a messageId has been provided
                if(!string.IsNullOrWhiteSpace(message.MessageId))
                    //### inform the client that the message has been received and processed.
                    await _clientManager.SendMessage(message.ClientId,
                        new ActionMessage
                        {
                            MessageId = message.MessageId,
                            MessageType = MessageType.Confirmation
                        });

            }
        }

        private static async Task<string> ReceiveStringAsync(WebSocket socket, CancellationToken ct = default(CancellationToken))
        {
            var buffer = new ArraySegment<byte>(new byte[8192]);
            using (var ms = new MemoryStream())
            {
                WebSocketReceiveResult result;
                do
                {
                    ct.ThrowIfCancellationRequested();

                    result = await socket.ReceiveAsync(buffer, ct);
                    ms.Write(buffer.Array, buffer.Offset, result.Count);
                }
                while (!result.EndOfMessage);

                ms.Seek(0, SeekOrigin.Begin);
                if (result.MessageType != WebSocketMessageType.Text)
                {
                    return null;
                }

                using (var reader = new StreamReader(ms, Encoding.UTF8))
                {
                    return await reader.ReadToEndAsync();
                }
            }
        }
    }
}