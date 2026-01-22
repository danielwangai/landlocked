"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch } from "@/store/hooks";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createUserAccount } from "@/store/thunks";
import { toast } from "react-toastify";
import { getProvider, UserService } from "@/services/blockchain";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../../target/types/landlocked";
import { User } from "@/utils/interfaces";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/contexts/UserRoleContext";
import { extractOnchainErrorMessage } from "@/utils/helpers";

export default function CreateAccountPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { userRole, refreshUserRole } = useUserRole();
  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );
  const userService = useMemo(() => {
    if (!program) return null;
    return new UserService(program as Program<Landlocked>);
  }, [program]);

  // states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const handleCreateUserAccount = async () => {
    try {
      if (!publicKey) {
        toast.error("Please connect your wallet");
        return;
      }

      // Check if ID number is already in use
      const idExists = users.some((user) => user.idNumber === idNumber);
      if (idExists) {
        toast.error("This ID number is already registered. Please use a different ID number.");
        return;
      }

      setIsSubmitting(true);
      const result = await dispatch(
        createUserAccount({
          userService: userService as UserService,
          firstName: firstName,
          lastName: lastName,
          idNumber: idNumber,
          phoneNumber: phoneNumber,
          walletAddress: publicKey.toString(),
        })
      );

      if (createUserAccount.fulfilled.match(result)) {
        toast.success("Your account has been created successfully");
        // Refresh user role with the idNumber that was just created
        await refreshUserRole(idNumber);
        setFirstName("");
        setLastName("");
        setIdNumber("");
        setPhoneNumber("");
        // Redirect to dashboard after successful account creation
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000); // Small delay to show success message
      } else if (createUserAccount.rejected.match(result)) {
        const errorMessage = extractOnchainErrorMessage(
          result.payload,
          "Failed to create your account. Please try again."
        );
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = extractOnchainErrorMessage(
        error,
        "Failed to create your account. Please try again."
      );
      toast.error(errorMessage);
      console.error("Error creating account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if user already has an account
  useEffect(() => {
    if (userRole) {
      router.push("/dashboard");
    }
  }, [userRole, router]);

  useEffect(() => {
    if (!userService) return;
    (async () => {
      try {
        const fetchedUsers = await userService.fetchUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    })();
  }, [userService]);

  return (
    <div className="flex flex-col items-center h-screen">
      <div className="flex flex-col items-center justify-center w-1/2 bg-[#f5f1ec] border-2 rounded-md p-6">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <div className="flex flex-col items w-full">
          <label htmlFor="first-name" className="text-md font-bold">
            First Name
          </label>
          <Input
            type="text"
            placeholder="First Name"
            className="w-full py-7 my-4 border-gray-400"
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="flex flex-col items w-full">
          <label htmlFor="last-name" className="text-md font-bold">
            Last Name
          </label>
          <Input
            type="text"
            placeholder="Last Name"
            className="w-full py-7 my-4 border-gray-400"
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="flex flex-col items w-full">
          <label htmlFor="id-number" className="text-md font-bold">
            ID Number
          </label>
          <Input
            type="text"
            placeholder="ID Number"
            className="w-full py-7 my-4 border-gray-400"
            onChange={(e) => setIdNumber(e.target.value)}
          />
        </div>
        <div className="flex flex-col items w-full">
          <label htmlFor="phone-number" className="text-md font-bold">
            Phone Number
          </label>
          <Input
            type="text"
            placeholder="Phone Number"
            className="w-full py-7 my-4 border-gray-400"
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <Button
          className="w-full bg-[#a36143] hover:bg-[#ac7156] text-white rounded-[3px] px-8 py-7 mt-4 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            isSubmitting || !publicKey || !firstName || !lastName || !idNumber || !phoneNumber
          }
          onClick={handleCreateUserAccount}
        >
          {!publicKey
            ? "Connect Wallet to Create Account"
            : isSubmitting
            ? "Creating..."
            : "Create Account"}
        </Button>
      </div>
    </div>
  );
}
