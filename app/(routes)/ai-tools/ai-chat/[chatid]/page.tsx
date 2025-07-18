'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoaderCircle, Send } from 'lucide-react'
import React, { useEffect, useState, useCallback } from 'react'
import EmptyState from '../_components/EmptyState'
import axios from 'axios'
// import ReactMarkdown from 'react-markdown'
import { useParams, useRouter } from 'next/navigation'

import { v4 as uuidv4 } from 'uuid';

type Message = {
  content: string,
  role: string,
  type: string
}

function AiChat() {
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [messageList, setMessageList] = useState<Message[]>([]);

  const params = useParams<{ chatid: string }>();
  const chatid = params.chatid;
  const router = useRouter();

  const GetMessageList = async () => {
    const result = await axios.get('/api/history?recordId=' + chatid);
    console.log(result.data);
    setMessageList(
      Array.isArray(result?.data?.content)
        ? result.data.content
        : result?.data?.content
          ? [result.data.content]
          : []
    );
  };

  const updateMessageList = useCallback(async () => {
    const result = await axios.put('/api/history', {
      content: messageList,
      recordId: chatid
    });
    console.log(result);
  }, [messageList, chatid]);

  useEffect(() => {
    if (chatid) {
      GetMessageList();
    }
  }, [chatid]);

  useEffect(() => {
    if (messageList?.length > 0) {
      updateMessageList();
    }
  }, [messageList, updateMessageList]);

  const onSend = async () => {
    setLoading(true);
    setMessageList(prev => [...prev, {
      content: userInput,
      role: 'user',
      type: 'text'
    }]);
    setUserInput('');
    const result = await axios.post('/api/ai-offer-chat-agent', {
      userInput: userInput
    });
    console.log(result.data);
    setMessageList(prev => [...prev, result.data]);
    setLoading(false);
  }

  const onNewChat = async () => {
    const id = uuidv4();
    const result = await axios.post('/api/history', {
      recordId: id,
      content: []
    });
    console.log(result);
    router.replace("/ai-tools/ai-chat/" + id)
  }

  return (
    <div className='px-10 md:px-24 lg:px-36 xl:px-48 h-[75vh] '>
      <div className='flex items-center justify-between gap-8'>
        <div>
          <h2 className='font-bold text-lg'>Ajánlat Chat</h2>
          <p className="font-bold text-lg bg-gradient-to-tl from-blue-800 to-blue-900 text-transparent bg-clip-text">
            okosabb ajánlatokat adhatsz
          </p>
        </div>
        <Button onClick={onNewChat}>+ Új Csevegés</Button>
      </div>

      <div className='flex flex-col h-[70vh] overflow-auto '>
        {messageList?.length <= 0 && (
          <div className='mt-5'>
            <EmptyState selectedQuestion={(question: string) => setUserInput(question)} />
          </div>
        )}

        <div className='flex-1 mt-8'>
          {messageList?.map((message, index) => (
            <div key={index}>
              <div className={`flex mb-2 ${message.role == 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg gap-2 ${message.role == 'user'
                  ? 'bg-gray-200 text-black rounded-lg'
                  : 'bg-gray-50 text-black'
                  }`}>
                  {message.content}
                </div>
              </div>
              {loading && messageList?.length - 1 === index && (
                <div className='flex justify-start p-3 rounded-lg gap-2 bg-gray-50 text-black mb-2'>
                  <LoaderCircle className='animate-spin' /> Thinking...
                </div>
              )}
            </div>
          ))}
        </div>

        <div className='flex justify-between items-center gap-6 absolute bottom-5 w-[50%]'>
          <Input
            placeholder='Type here'
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
          />
          <Button onClick={onSend} disabled={loading}>
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AiChat;
