import { PawPrint, Target, FileText, Shield, ArrowRight, UserPlus } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <img 
            src="/logo.png" 
            alt="All Saints Day School" 
            className="w-44 h-44 mx-auto mb-6 object-contain transition-all duration-500 hover:scale-110 hover:rotate-[360deg] cursor-pointer"
          />
          <h1 className="text-4xl md:text-5xl font-semibold text-[#1e3a5f] mb-3 tracking-tight">
            AI Learning Lab
          </h1>
          <p className="text-lg text-slate-500 font-light">
            Choose your adventure
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <a href="/register" className="group">
            <div className="flex items-center gap-3 px-6 py-3 rounded-full border-2 border-[#1e3a5f]/20 bg-gradient-to-r from-[#1e3a5f]/5 to-[#1e3a5f]/10 text-[#1e3a5f] transition-all duration-300 hover:border-[#1e3a5f]/40 hover:shadow-md hover:-translate-y-0.5">
              <UserPlus className="w-5 h-5" />
              <span className="font-medium">Register for Class</span>
              <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
            </div>
          </a>
        </div>
        
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          <a href="/safety-lab" className="group">
            <div className="h-56 bg-gradient-to-br from-white to-violet-50 rounded-2xl border-2 border-violet-100 shadow-lg p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:border-violet-400 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-violet-200 group-hover:scale-110">
                <PawPrint className="w-7 h-7 text-violet-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-800 text-center mb-2">
                AI Safety Lab
              </h2>
              <p className="text-sm text-gray-400 text-center mb-3">
                Write moderation prompts
              </p>
              <div className="flex items-center gap-1 text-violet-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Start</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </a>
          
          <a href="/precision-recall" className="group">
            <div className="h-56 bg-gradient-to-br from-white to-emerald-50 rounded-2xl border-2 border-emerald-100 shadow-lg p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:border-emerald-400 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110">
                <Target className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-800 text-center mb-2">
                Precision & Recall
              </h2>
              <p className="text-sm text-gray-400 text-center mb-3">
                Learn ML metrics
              </p>
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Start</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </a>
          
          <a href="/prd-generator" className="group">
            <div className="h-56 bg-gradient-to-br from-white to-amber-50 rounded-2xl border-2 border-amber-100 shadow-lg p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:border-amber-400 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-amber-200 group-hover:scale-110">
                <FileText className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-800 text-center mb-2">
                PRD Generator
              </h2>
              <p className="text-sm text-gray-400 text-center mb-3">
                Build your app idea
              </p>
              <div className="flex items-center gap-1 text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Start</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </a>
        </div>

        <div className="flex justify-center">
          <a href="/teacher" className="group">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1e3a5f]/20 bg-white text-[#1e3a5f]/70 transition-all duration-300 hover:border-[#1e3a5f]/40 hover:shadow-sm hover:text-[#1e3a5f]">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Teacher Dashboard</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
