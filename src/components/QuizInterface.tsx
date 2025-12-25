'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Question } from '@/lib/gemini';

interface QuizInterfaceProps {
  questions: Question[];
  onReset: () => void;
}

export function QuizInterface({ questions, onReset }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (isAnswerRevealed) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption) return;
    
    const isCorrect = selectedOption === currentQuestion.answer;
    if (isCorrect) {
      setScore(s => s + 1);
    }
    setIsAnswerRevealed(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      setShowResults(true);
    }
  };

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl mx-auto p-8 rounded-2xl bg-white shadow-xl text-center"
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-900">Quiz Completed!</h2>
        
        <div className="mb-8">
          <div className="text-6xl font-bold mb-2 text-blue-600">
            {percentage}%
          </div>
          <p className="text-gray-500">
            You scored {score} out of {questions.length} questions
          </p>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="w-5 h-5" />
          Generate New Quiz
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8 flex justify-between items-center text-sm font-medium text-gray-500">
        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
        >
          <h3 className="text-xl font-semibold mb-6 text-gray-900 leading-relaxed">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQuestion.answer;
              const showCorrect = isAnswerRevealed && isCorrect;
              const showWrong = isAnswerRevealed && isSelected && !isCorrect;

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isAnswerRevealed}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden",
                    isSelected && !isAnswerRevealed ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300",
                    showCorrect ? "border-green-500 bg-green-50" : "",
                    showWrong ? "border-red-500 bg-red-50" : "",
                    isAnswerRevealed && !isSelected && !showCorrect ? "opacity-50" : ""
                  )}
                >
                  <div className="flex items-center justify-between z-10 relative">
                    <span className={cn(
                      "font-medium",
                      showCorrect ? "text-green-700" : 
                      showWrong ? "text-red-700" : 
                      "text-gray-700"
                    )}>
                      {option}
                    </span>
                    {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {showWrong && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex justify-end">
        {!isAnswerRevealed ? (
          <button
            onClick={handleCheckAnswer}
            disabled={!selectedOption}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
