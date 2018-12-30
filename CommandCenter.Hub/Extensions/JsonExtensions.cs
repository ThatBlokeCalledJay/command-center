using System.Runtime.Serialization.Json;
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
                : Newtonsoft.Json.JsonConvert.SerializeObject(data, new JsonSerializerSettings(){ContractResolver = new CamelCasePropertyNamesContractResolver()} );
        }

        public static T FromJson<T>(this string data)
        {
            return string.IsNullOrWhiteSpace(data)
                ? default(T)
                : Newtonsoft.Json.JsonConvert.DeserializeObject<T>(data);
        }
    }
}