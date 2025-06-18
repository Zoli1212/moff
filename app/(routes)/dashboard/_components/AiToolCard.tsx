"use client";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DetailUploadDialog from "./DemandUploadDialog";
import OfferGeneratorDialog from "./OfferGeneratorDialog";
import TextInputDialog from "./TextInputDialog";

export interface TOOL {
  name: string;
  desc: string;
  icon: string;
  button: string;
  path: string;
}

type AIToolProps = {
  tool: TOOL;
};

function AiToolCard({ tool }: AIToolProps) {
  const id = uuidv4();
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openOfferDialog, setOpenOfferDialog] = useState(false);
  const [openTextInput, setOpenTextInput] = useState(false);
  
  const onClickButton = async () => {
    console.log(tool.name, user?.emailAddresses?.[0]?.emailAddress);

    if (tool.name === "Igény Elemző") {
      setOpen(true);
      return;
    }
    
    if (tool.path === "/ai-tools/ai-cost-calculator") {
      setOpenOfferDialog(true);
      return;
    }
    
    if (tool.path === "/ai-tools/ai-offer-letter") {
      setOpenTextInput(true);
      return;
    }

    // Create New record to History Table
    const result = await axios.post("/api/history", {
      recordId: id,
      content: [],
      aiAgentType: tool.path,
    });
    console.log(result);
    router.push(tool.path + "/" + id);
  };

  console.log(open, "open");
  return (
    <div className="p-3 border rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
      <Image src={tool.icon} width={40} height={40} alt={tool.name} />
      <h2 className="font-bold mt-2">{tool.name}</h2>
      <p className="text-gray-400">{tool.desc}</p>

      <Button className="w-full mt-3" onClick={onClickButton}>
        {tool.button}
      </Button>

      <DetailUploadDialog open={open} setOpen={setOpen} />
      <OfferGeneratorDialog
        openDialog={openOfferDialog}
        setOpenDialog={setOpenOfferDialog}
      />
      <TextInputDialog 
        open={openTextInput} 
        setOpen={setOpenTextInput} 
        toolPath="/ai-tools/ai-offer-letter"
      />
    </div>
  );
}

export default AiToolCard;
