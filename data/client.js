import Client, { Network } from "@helium/http";

export const TAKE_MAX = 100000;

const client = new Client(Network.stakejoy);
//
// const client = new Client(Network.staging);
//
const client = new Client();

export default client;
