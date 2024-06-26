// https://vike.dev/data
import { lowDb } from "../../database/todoItems";

export type Data = {
  todo: { text: string }[];
};

export default async function data(): Promise<Data> {
  lowDb.read();
  return lowDb.data;
}
