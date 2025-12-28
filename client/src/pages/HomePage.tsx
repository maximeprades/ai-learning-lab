import { PawPrint, Target, FileText, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-stone-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-3 tracking-tight">
            AI Learning Lab
          </h1>
          <p className="text-lg text-gray-500 font-light">
            Choose your adventure
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          <a href="/precision-recall" className="group">
            <div className="h-56 bg-white rounded-2xl border border-gray-200 shadow-md p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-emerald-100 group-hover:scale-110">
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
          
          <a href="/safety-lab" className="group">
            <div className="h-56 bg-white rounded-2xl border border-gray-200 shadow-md p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:border-violet-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-violet-100 group-hover:scale-110">
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
          
          <a href="/prd-generator" className="group">
            <div className="h-56 bg-white rounded-2xl border border-gray-200 shadow-md p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:border-amber-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-amber-100 group-hover:scale-110">
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
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-gray-600 transition-all duration-300 hover:border-gray-300 hover:shadow-sm hover:text-gray-800">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Teacher Dashboard</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
