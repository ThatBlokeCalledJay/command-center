using CommandCenter.Hub.Enums;
using CommandCenter.Hub.Extensions;
using CommandCenter.Hub.Models;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace CommandCenter.HubTests
{
    [TestClass]
    public class CommonUtilityTests
    {
        [TestMethod]
        public void JsonParseToActionMessage_TypeMessage()
        {
            var jsonString =
                "{\"clientId\":\"stringValue\",\"messageType\":100,\"action\": {\"clientId\":\"123-456-789\", \"message\":\"TEST MESSAGE\"}}";
            
            var actionMessage = jsonString.FromJson<ControlMessage>();
            var message = actionMessage.ToAction<MessageAction>();

            Assert.AreEqual(MessageType.Message, actionMessage.MessageType);
            Assert.IsNotNull(message);
            Assert.AreEqual("TEST MESSAGE", message.Message);
            Assert.AreEqual("123-456-789", message.ClientId);
        }
    }
}
