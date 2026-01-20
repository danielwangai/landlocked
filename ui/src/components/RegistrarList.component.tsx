import { getProvider, RegistrarService } from "@/services/blockchain";
import { useEffect, useMemo, useState } from "react";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { useWallet } from "@solana/wallet-adapter-react";
import { Registrar } from "@/utils/interfaces";
import DataTable, { Column } from "./DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CircleOff, MoreHorizontal, Trash2 } from "lucide-react";

export default function RegistrarListComponent() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );
  const registrarService = useMemo(() => {
    if (!program) return null;
    return new RegistrarService(program as Program<Landlocked>);
  }, [program]);
  const [registrars, setRegistrars] = useState<Registrar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (registrarService && publicKey) {
      setLoading(true);
      registrarService
        .getRegistrars()
        .then((registrars: Registrar[]) => {
          setRegistrars(registrars);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [registrarService, publicKey]);

  const handleDelete = (registrar: Registrar) => {
    // TODO: Implement delete functionality
    console.log("Delete registrar:", registrar.authority.toString());
  };

  const handleDeactivate = (registrar: Registrar) => {
    // TODO: Implement deactivate functionality
    console.log("Deactivate registrar:", registrar.authority.toString());
  };

  const columns: Column<Registrar>[] = [
    {
      header: "Name",
      accessor: (row) => `${row.firstName} ${row.lastName}`,
      className: "font-medium",
      headerClassName: "w-[100px]",
    },
    {
      header: "ID Number",
      accessor: "idNumber",
    },
    {
      header: "Address/Authority",
      accessor: (row) => row.authority.toString(),
    },
    {
      header: "Status",
      accessor: (row) => (row.isActive ? "Active" : "Inactive"),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      header: "Actions",
      accessor: () => "",
      className: "text-right",
      headerClassName: "text-right",
      actions: (row) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1 rounded hover:bg-gray-100 focus:outline-none">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDeactivate(row)}>
                <CircleOff className="w-5 h-5" /> Deactivate
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row)}>
                <Trash2 className="w-5 h-5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={registrars}
      columns={columns}
      caption="A list of registrars"
      keyExtractor={(row) => row.authority.toString()}
      loading={loading}
    />
  );
}
