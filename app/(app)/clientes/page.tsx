import ClientsManager from "@/components/clients/ClientsManager";
import { clients } from "@/lib/data";

export default function ClientsPage() {
  return <ClientsManager demoClients={clients} />;
}
