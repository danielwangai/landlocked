import { Button } from "./ui/button";
import RegistrarListComponent from "./RegistrarList.component";
import { PlusIcon } from "lucide-react";

export default function RegistrarComponent() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-between">
        <h1 className="text-2xl font-bold">Registrar Management</h1>
        <Button className="bg-[#a36143] hover:bg-[#ac7156] text-white rounded-[3px] px-6 py-6 text-lg transition-colors">
          <PlusIcon className="w-10 h-10" /> Add Registrar
        </Button>
      </div>
      <RegistrarListComponent />
    </div>
  );
}
