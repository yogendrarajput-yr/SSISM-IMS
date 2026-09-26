import React, { useState, useEffect, useRef } from 'react';
import { Search, Laptop, User, X, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

/**
 * Global Search Component
 * Provides debounced auto-complete searching across laptop tags, serial numbers,
 * student roll numbers, and names, with an interactive quick-access dropdown.
 */
export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ assets: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Execute global search API request on debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults({ assets: [], users: [] });
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/assets/search?q=${encodeURIComponent(debouncedQuery)}`);
        setResults(res.data.data || { assets: [], users: [] });
        setIsOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Handle outside click to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to asset detail view
  const handleSelectAsset = (assetId) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/inventory/${assetId}`);
  };

  // Navigate to allocations filtered by recipient roll number
  const handleSelectUser = (user) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/allocations?search=${encodeURIComponent(user.rollNumberOrEmpId)}`);
  };

  const totalHits = results.assets.length + results.users.length;

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      {/* Search Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#F26522]" /> : <Search className="w-4 h-4" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => totalHits > 0 && setIsOpen(true)}
          placeholder="Global search (Tag, Serial, Roll No, Name)..."
          className="w-full pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-xs rounded-xl border border-transparent focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder-slate-400 transition-all outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-scale-up max-h-96 overflow-y-auto">
          {totalHits === 0 && !loading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-medium">
              No matching laptops or campus users found for "{query}"
            </div>
          ) : (
            <div>
              {/* Laptops Section */}
              {results.assets.length > 0 && (
                <div className="p-2 border-b border-slate-100">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Laptops & Hardware ({results.assets.length})
                  </div>
                  {results.assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset.id)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-orange-50/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#F26522] flex items-center justify-center font-bold border border-orange-100">
                          <Laptop className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                            <span className="font-mono text-[#F26522]">{asset.assetTag}</span>
                            <span className="text-[10.5px] text-slate-400 font-normal">({asset.serialNumber})</span>
                          </div>
                          <div className="text-[10.5px] text-slate-500">
                            {asset.make} {asset.model} •{' '}
                            <span
                              className={
                                asset.status === 'AVAILABLE'
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-blue-600 font-bold'
                              }
                            >
                              {asset.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  ))}
                </div>
              )}

              {/* Students & Faculty Section */}
              {results.users.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Students & Faculty ({results.users.length})
                  </div>
                  {results.users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-orange-50/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            <span className="text-[10.5px] text-slate-400 font-mono">({u.rollNumberOrEmpId})</span>
                          </div>
                          <div className="text-[10.5px] text-slate-500">
                            {u.role} • Dept: {u.department?.code || 'General'}
                            {u.receivedAllocations?.length > 0 && (
                              <span className="ml-1 text-blue-600 font-medium">
                                • Issued: {u.receivedAllocations[0].asset.assetTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
