import { PawPrint, Target } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            AI Learning Lab
          </h1>
          <p className="text-xl text-indigo-200">
            Choose your adventure
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <a href="/precision-recall">
            <button className="group relative w-full h-64 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-emerald-500/30 hover:shadow-[0_20px_60px_-15px] focus:outline-none focus:ring-4 focus:ring-emerald-400/50">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center group-hover:translate-y-[-4px] transition-transform duration-300">
                  Precision and Recall Game
                </h2>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </button>
          </a>
          
          <a href="/safety-lab">
            <button className="group relative w-full h-64 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-violet-500/30 hover:shadow-[0_20px_60px_-15px] focus:outline-none focus:ring-4 focus:ring-violet-400/50">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <PawPrint className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center group-hover:translate-y-[-4px] transition-transform duration-300">
                  Prompt 101: AI Safety Lab
                </h2>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
