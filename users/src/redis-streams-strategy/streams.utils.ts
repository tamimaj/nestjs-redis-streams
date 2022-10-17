export async function deserialize(message: any) {
  try {
    // it has id, and inner array with key and value.
    let id = message[0];
    let key = message[1][0];
    let value = await parseJson(message[1][1]); // if cannot parse it will return it as it is.

    return { id, key, value };
  } catch (error) {
    console.log('Error deserialize: ', error);
  }
}

export async function serialize(message: any): Promise<string> {
  try {
    let stringfied = JSON.stringify(message);
    return stringfied;
  } catch (error) {
    console.log('Error serialize: ', error);
  }
}

export async function parseJson(data: string): Promise<any> {
  try {
    let parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.log('Could not parse JSON at deserialize', error);
    return data;
  }
}
