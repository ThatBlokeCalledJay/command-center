using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace CommandCenter.Hub.Extensions
{
    public static class JsonExtensions
    {
        public static string ToJson(this object data)
        {
            return data == null
                ? null
                : JsonConvert.SerializeObject(data,
                    new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
        }

        public static T FromJson<T>(this string data)
        {
            return string.IsNullOrWhiteSpace(data)
                ? default(T)
                : JsonConvert.DeserializeObject<T>(data);
        }
    }
}