import { fetchApi } from '../lib/api.js';

export const applicationService = {
  createApplication: async (applicationData) => {
    return fetchApi('/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData)
    });
  },

  getStudentApplications: async (studentId = null) => {
    const url = studentId ? `/applications/student/${studentId}` : '/applications/student';
    return fetchApi(url);
  },

  getGigApplications: async (gigId) => {
    return fetchApi(`/applications/gig/${gigId}`);
  },

  updateApplicationStatus: async (applicationId, status) => {
    return fetchApi(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};
