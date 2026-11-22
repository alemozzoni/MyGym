import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

/** undefined = verifica in corso, null = non autenticato */
const Contesto = createContext<User | null | undefined>(undefined);

/** Stato dell'accesso, condiviso con tutta l'app */
export function DatiProvider({ children }: { children: ReactNode }) {
  const [utente, setUtente] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUtente), []);
  return <Contesto.Provider value={utente}>{children}</Contesto.Provider>;
}

export const useUtente = () => useContext(Contesto);
