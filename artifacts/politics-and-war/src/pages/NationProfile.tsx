import { useParams } from "wouter";
import NationView from "@/components/NationView";

export default function NationProfile() {
  const { id } = useParams();
  const nationId = parseInt(id || "0", 10);

  if (!nationId) return <div style={{ padding: 20, color: "#757575" }}>Invalid nation ID.</div>;

  return <NationView nationId={nationId} />;
}
