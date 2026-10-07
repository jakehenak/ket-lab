import { createFileRoute } from "@tanstack/react-router";
import { Workbench } from "@/components/quantum/Workbench";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Workbench />;
}
