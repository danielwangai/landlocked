import { Button } from "./ui/button";
import RegistrarListComponent from "./RegistrarList.component";
import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { DialogClose } from "./ui/dialog";
import { useMemo, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { addRegistrar, fetchRegistrars } from "@/store/thunks";
import { useAppDispatch } from "@/store/hooks";
import { getProvider, RegistrarService } from "@/services/blockchain";
import { toast } from "react-toastify";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { getUserType } from "@/utils/helpers";

export default function RegistrarComponent() {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );
  const registrarService = useMemo(() => {
    if (!program) return null;
    return new RegistrarService(program as Program<Landlocked>);
  }, [program]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey || !program) {
        return;
      }

      try {
        const userType = await getUserType(program as Program<Landlocked>, publicKey);
        setIsAdmin(userType === "admin");
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    })();
  }, [publicKey, program]);

  const handleAddRegistrar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!publicKey) {
        toast.error("Wallet not connected");
        setIsSubmitting(false);
        return;
      }
      if (!isAdmin) {
        toast.error("Only admins can add registrars");
        setIsSubmitting(false);
        return;
      }
      if (!registrarService) {
        toast.error("Registrar service not available");
        setIsSubmitting(false);
        return;
      }
      const adminAuthority = publicKey;
      const result = await dispatch(
        addRegistrar({
          registrarService,
          firstName,
          lastName,
          idNumber,
          walletAddress,
          adminAuthority,
        })
      );

      if (addRegistrar.fulfilled.match(result)) {
        toast.success("Registrar added successfully");
        setFirstName("");
        setLastName("");
        setIdNumber("");
        setWalletAddress("");
        setIsDialogOpen(false);
        // Refetch registrars list after successful creation
        if (registrarService) {
          dispatch(fetchRegistrars({ registrarService }));
        }
      } else if (addRegistrar.rejected.match(result)) {
        const errorMessage = "Failed to add registrar";
        toast.error(errorMessage);
        console.error("Registrar Add Error: ", result);
      }
    } catch (error: any) {
      toast.error("Failed to add registrar");
      console.error("Error adding registrar: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-between">
        <h1 className="text-2xl font-bold">Registrar Management</h1>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#a36143] hover:bg-[#ac7156] text-white rounded-[3px] px-6 py-6 text-lg transition-colors"
                disabled={isSubmitting}
              >
                <PlusIcon className="w-10 h-10" /> Add Registrar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#efe7de]">
              <form onSubmit={handleAddRegistrar}>
                <DialogHeader>
                  <DialogTitle>Add Registrar</DialogTitle>
                  <DialogDescription>Enter the details for the new registrar</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <label htmlFor="firstname" className="text-sm font-bold">
                      First Name
                    </label>
                    <Input
                      id="firstname"
                      name="firstName"
                      placeholder="Job"
                      required
                      className="bg-[#f5f1ec] border-[#d3aa7b]"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-3">
                    <label htmlFor="lastname" className="text-sm font-bold">
                      Last Name
                    </label>
                    <Input
                      className="bg-[#f5f1ec] border-[#d3aa7b]"
                      id="lastname"
                      name="lastName"
                      required
                      placeholder="Ochieng'"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-3">
                    <label htmlFor="idNumber" className="text-sm font-bold">
                      ID Number
                    </label>
                    <Input
                      className="bg-[#f5f1ec] border-[#d3aa7b]"
                      id="idNumber"
                      name="idNumber"
                      required
                      placeholder="11250378"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-3">
                    <label htmlFor="walletAddress" className="text-sm font-bold">
                      Solana Wallet Address
                    </label>
                    <Input
                      className="bg-[#f5f1ec] border-[#d3aa7b]"
                      id="walletAddress"
                      name="walletAddress"
                      required
                      placeholder="solana wallet address"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-col justify-end gap-2">
                  <DialogClose asChild>
                    <Button
                      className="bg-[#f5f1ec] border-[#d3aa7b] text-[#a36143] rounded-[3px] text-md px-6 py-6"
                      variant="outline"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    className="bg-[#a36143] hover:bg-[#ac7156] text-white rounded-[3px] px-6 py-6 text-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <RegistrarListComponent />
    </div>
  );
}
