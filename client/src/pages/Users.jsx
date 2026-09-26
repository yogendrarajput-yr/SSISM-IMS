import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Students } from './Students';
import { StaffDirectory } from './StaffDirectory';
import { GraduationCap, UserCheck, Users as UsersIcon } from 'lucide-react';

/**
 * Unified Users Module Page
 * Merges Student Directory and Faculty & Staff into a single top-level workspace
 * with interactive role switching (Students vs Faculty & Staff).
 */
export const Users = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRole = searchParams.get('role') === 'faculty' ? 'faculty' : 'student';

  const handleSelectRole = (role) => {
    setSearchParams({ role });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Role Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#F26522]">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Campus Users & Custody Directory
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Unified institutional registry for verified students, academic faculty, and administrative staff
              </p>
            </div>
          </div>
        </div>

        {/* Role Filter Tabs (Faculty vs Students) */}
        <div className="inline-flex p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 self-start sm:self-center">
          <button
            type="button"
            onClick={() => handleSelectRole('student')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentRole === 'student'
                ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-500'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Students</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole('faculty')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentRole === 'faculty'
                ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-500'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Faculty & Staff</span>
          </button>
        </div>
      </div>

      {/* Render active directory component */}
      {currentRole === 'faculty' ? <StaffDirectory hideTitle={true} /> : <Students hideTitle={true} />}
    </div>
  );
};
