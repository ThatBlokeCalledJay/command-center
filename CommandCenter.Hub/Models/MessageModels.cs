using CommandCenter.Hub.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CommandCenter.Hub.Models
{
    public class ActionMessage
    {
        public string MessageId { get; set; }
        public MessageType MessageType { get; set; }
        public object Action { get; set; }
    }

    public class ControlMessage
    {
        public string MessageId { get; set; }
        public string ClientId { get; set; }

        public MessageType MessageType { get; set; }

        public JObject Action { get; set; }

        public T ToAction<T>() where T : class
        {
            return Action.ToObject<T>();
        }
    }

    public class RegisterAction
    {
        public string ClientName { get; set; }
        public ClientType ClientType { get; set; }
    }

    public class MessageAction
    {
        /// <summary>
        /// The intended recipient for this message. Leave blank to send to all clients.
        /// </summary>
        public string ClientId { get; set; }
        public string Message { get; set; }
    }

    public class DataAction
    {
        /// <summary>
        /// The intended recipient for this action. Leave blank to send to all clients.
        /// </summary>
        public string ClientId { get; set; }

        public byte[] Data { get; set; }
    }

    public class ImageAction
    {
        /// <summary>
        /// The intended recipient for this action. Leave blank to send to all clients.
        /// </summary>
        public string ClientId { get; set; }

        /// <summary>
        /// Base64 string.
        /// </summary>
        public string Data { get; set; }
    }

    public class MoveAction
    {
        /// <summary>
        /// The intended recipient for this action. Leave blank to send to all clients.
        /// </summary>
        public string ClientId { get; set; }
        public Axis Axis { get; set; }
    }

    public class Axis
    {
        public int X { get; set; }
        public int Y { get; set; }
    }
}
