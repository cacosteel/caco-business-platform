import { useEffect, useState } from "react";
import { getContacts } from "../services/contactService";
import type { contact } from "../types/contact";

export function useContacts() {
  const [contacts, setContacts] = useState<contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);

    try {
      const data = await getContacts();
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    contacts,
    loading,
    refresh: loadContacts,
  };
}