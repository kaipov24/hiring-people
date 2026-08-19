import { deleteCvFile } from "../config/storage.js";
import { ActivityEvent } from "../models/activity-event.model.js";
import { CandidateProfile } from "../models/candidate-profile.model.js";
import { CandidateStatus } from "../models/candidate-status.model.js";
import { ProfileView } from "../models/profile-view.model.js";
import { Recruiter } from "../models/recruiter.model.js";
import { User } from "../models/user.model.js";

export const deleteUserAndRelatedData = async (userId) => {
  const candidateProfile = await CandidateProfile.findOne({ user: userId });
  await deleteCvFile(candidateProfile?.cv);

  const recruiters = await Recruiter.find({ owner: userId }).select("_id");
  const recruiterIds = recruiters.map((recruiter) => recruiter.id);

  await Promise.all([
    CandidateProfile.deleteMany({ user: userId }),
    Recruiter.deleteMany({ owner: userId }),
    ProfileView.deleteMany({
      $or: [
        { candidate: userId },
        { viewedBy: userId },
        { recruiter: { $in: recruiterIds } }
      ]
    }),
    CandidateStatus.deleteMany({
      $or: [
        { candidate: userId },
        { updatedBy: userId },
        { recruiter: { $in: recruiterIds } }
      ]
    }),
    ActivityEvent.deleteMany({ user: userId }),
    User.deleteOne({ _id: userId })
  ]);
};
