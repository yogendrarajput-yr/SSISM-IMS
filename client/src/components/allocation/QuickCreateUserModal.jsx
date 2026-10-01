import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { User, GraduationCap, Briefcase, AlertTriangle, CheckCircle, Phone, Mail, Hash } from 'lucide-react';

/**
 * QuickCreateUserModal Component
 * 
 * Provides fast, inline creation of a new Student or Employee (Staff/Faculty)
 * directly inside the Allocation workflow without leaving or refreshing the page.
 * 
 * Enforces required Email and Mobile Phone numbers as per SSISM IT policy.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility flag
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onUserCreated - Callback invoked with the newly created user record
 */
export const QuickCreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
  const [userType, setUserType] = useState('STUDENT'); // 'STUDENT' | 'EMPLOYEE'
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumberOrEmpId: '',
    departmentId: '',
    // Student specific
    branch: 'IT Excellence Group',
    batchYear: '2024-2028',
    fatherName: '',
    feeStatus: 'PAID',
    // Employee specific
    role: 'FACULTY',
    designation: 'Assistant Professor',
    aadhaarNumber: '',
  });

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        rollNumberOrEmpId: '',
        departmentId: '',
        branch: 'IT Excellence Group',
        batchYear: '2024-2028',
        fatherName: '',
        feeStatus: 'PAID',
        role: 'FACULTY',
        designation: 'Assistant Professor',
        aadhaarNumber: '',
      });
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data?.data?.departments || []);
    } catch (err) {
      console.error('Failed to load departments in quick create modal:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Valid Email ID is required for campus credentials.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Mobile Number is required for SMS and WhatsApp custody alerts.');
      return;
    }
    if (!formData.rollNumberOrEmpId.trim()) {
      setError(userType === 'STUDENT' ? 'Student Roll Number is required.' : 'Employee ID is required.');
      return;
    }

    setLoading(true);

    try {
      let createdUser = null;

      if (userType === 'STUDENT') {
        const studentPayload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          rollNumber: formData.rollNumberOrEmpId.trim(),
          fatherName: formData.fatherName.trim() || undefined,
          branch: formData.branch,
          batchYear: formData.batchYear,
          departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
          aadhaarNumber: formData.aadhaarNumber.trim() || undefined,
          feeStatus: formData.feeStatus,
        };

        const res = await api.post('/users/students', studentPayload);
        createdUser = res.data?.data?.student;
      } else {
        const staffPayload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          employeeId: formData.rollNumberOrEmpId.trim(),
          role: formData.role,
          designation: formData.designation.trim() || 'Faculty Member',
          departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
          aadhaarNumber: formData.aadhaarNumber.trim() || undefined,
        };

        const res = await api.post('/users/staff', staffPayload);
        createdUser = res.data?.data?.staff;
      }

      if (createdUser) {
        // Normalize user for recipient selection
        const recipientCandidate = {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          phone: createdUser.phone,
          rollNumberOrEmpId: createdUser.rollNumberOrEmpId,
          role: createdUser.role,
          batchYear: createdUser.batchYear,
          department: createdUser.department || departments.find((d) => d.id === createdUser.departmentId) || null,
          receivedAllocations: [],
          licenseFeeRecords: createdUser.licenseFeeRecords || [
            {
              status: formData.feeStatus || 'PAID',
              amount: 1500,
              academicYear: '2025-2026',
            },
          ],
        };

        onUserCreated(recipientCandidate);
        onClose();
      }
    } catch (err) {
      console.error('Quick user creation error:', err);
      setError(err.response?.data?.message || 'Failed to create user. Please verify all details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Recipient (Student / Employee)"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle User Category */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setUserType('STUDENT')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              userType === 'STUDENT'
                ? 'bg-white text-[#F26522] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>New Student</span>
          </button>
          <button
            type="button"
            onClick={() => setUserType('EMPLOYEE')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              userType === 'EMPLOYEE'
                ? 'bg-white text-[#F26522] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>New Employee / Faculty</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Name & Roll/Employee ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={userType === 'STUDENT' ? 'e.g., Rohit Sharma' : 'e.g., Prof. Anita Joshi'}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {userType === 'STUDENT' ? 'Roll Number / Scholar ID *' : 'Employee ID *'}
            </label>
            <input
              type="text"
              required
              value={formData.rollNumberOrEmpId}
              onChange={(e) => setFormData({ ...formData, rollNumberOrEmpId: e.target.value })}
              placeholder={userType === 'STUDENT' ? 'e.g., 24CS109' : 'e.g., EMP-FAC-042'}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
            />
          </div>
        </div>

        {/* Email & Phone (Both Strictly Required) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Email ID (Campus Login) *</span>
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="username@ssism.edu"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Mobile Phone Number *</span>
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Academic / Employment Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Department
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
            >
              <option value="">-- Choose Department --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {userType === 'STUDENT' ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Batch Year
              </label>
              <input
                type="text"
                value={formData.batchYear}
                onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
                placeholder="2024-2028"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Role & Designation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                >
                  <option value="FACULTY">Faculty</option>
                  <option value="STAFF">Staff</option>
                  <option value="HIGHER_MANAGEMENT">Management</option>
                </select>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Designation"
                  className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Student Fee Clearance Option */}
        {userType === 'STUDENT' && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                Software License Fee Status
              </span>
              <span className="text-[11px] text-amber-700">
                Determines whether a clearance warning is triggered on allocation
              </span>
            </div>
            <select
              value={formData.feeStatus}
              onChange={(e) => setFormData({ ...formData, feeStatus: e.target.value })}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-amber-300 rounded-lg text-amber-900 focus:outline-none"
            >
              <option value="PAID">PAID (Clear)</option>
              <option value="UNPAID">UNPAID (Pending)</option>
            </select>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-[#F26522] hover:bg-orange-600 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Create & Select</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
