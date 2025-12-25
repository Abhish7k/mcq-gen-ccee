'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Question } from '@/lib/gemini';

interface QuestionBankProps {
  questions: Question[];
}

export function QuestionBank({ questions }: QuestionBankProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Group questions by topic
  const topics = useMemo(() => {
    const groups: Record<string, Question[]> = {};
    questions.forEach(q => {
      const topic = q.topic || 'General';
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(q);
    });
    return groups;
  }, [questions]);

  const topicNames = Object.keys(topics);

  if (selectedTopic) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedTopic(null)}
          className="text-blue-600 hover:underline flex items-center gap-1 mb-4 text-sm font-medium"
        >
          &larr; Back to Topics
        </button>
        
        <h2 className="text-3xl font-bold text-gray-800 border-b border-gray-200 pb-4 mb-8">
          {selectedTopic}
        </h2>

        <div className="space-y-10">
          {topics[selectedTopic].map((q, idx) => (
            <SanfoundryStyleQuestion key={idx} question={q} index={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Folder className="w-6 h-6 text-blue-600" />
        All Topics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topicNames.map((topic, i) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left group cursor-pointer hover:bg-blue-50/50"
          >
            <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
              {i + 1}. {topic}
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
              {topics[topic].length} Qs
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SanfoundryStyleQuestion({ question, index }: { question: Question; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="text-left font-sans text-gray-800">
      <p className="font-medium text-lg leading-relaxed mb-3">
        {index + 1}. {question.question}
      </p>
      
      <div className="space-y-1 mb-3 pl-1">
        {question.options.map((option, i) => (
          <div key={i} className="text-[15px] leading-relaxed text-gray-700">
            {String.fromCharCode(97 + i)}) {option}
          </div>
        ))}
      </div>

      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-all cursor-pointer"
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          View Answer
        </button>

        {isOpen && (
          <div className="mt-2 p-3 bg-[#f9f9f9] border border-[#e1e1e1] text-sm text-gray-700 font-medium">
             Answer: <span className="text-blue-600 font-bold mr-1">
                {(() => {
                    const idx = question.options.findIndex(o => o === question.answer);
                    return idx >= 0 ? String.fromCharCode(97 + idx) + ")" : "";
                })()}
             </span>
             {question.answer}
          </div>
        )}
      </div>
    </div>
  );
}
