import { Recruiter } from "../models/recruiter.model.js";

const recruiterPayload = (recruiter) => ({
  id: recruiter.id,
  owner: recruiter.owner,
  name: recruiter.name,
  description: recruiter.description,
  website: recruiter.website,
  contacts: {
    email: recruiter.contacts?.email || "",
    phone: recruiter.contacts?.phone || "",
    messenger: recruiter.contacts?.messenger || ""
  },
  accessibilityCommitments: recruiter.accessibilityCommitments,
  hiredCandidateCount: recruiter.hiredCandidateCount,
  createdAt: recruiter.createdAt,
  updatedAt: recruiter.updatedAt
});

export const getMyRecruiter = async (req, res) => {
  const recruiter = await Recruiter.findOne({ owner: req.user.id });

  if (!recruiter) {
    const error = new Error("Профиль рекрутера не найден");
    error.status = 404;
    throw error;
  }

  res.status(200).json({
    recruiter: recruiterPayload(recruiter)
  });
};

export const upsertMyRecruiter = async (req, res) => {
  const recruiter = await Recruiter.findOneAndUpdate(
    { owner: req.user.id },
    {
      $set: {
        name: req.body.name,
        description: req.body.description,
        website: req.body.website,
        contacts: req.body.contacts,
        accessibilityCommitments: req.body.accessibilityCommitments
      }
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true
    }
  );

  res.status(200).json({
    recruiter: recruiterPayload(recruiter)
  });
};

export const listRecruiters = async (_req, res) => {
  const recruiters = await Recruiter.find({})
    .sort({ updatedAt: -1, name: 1 })
    .limit(100);

  res.status(200).json({
    recruiters: recruiters.map(recruiterPayload)
  });
};

export const getRecruiter = async (req, res) => {
  const recruiter = await Recruiter.findById(req.params.id);

  if (!recruiter) {
    const error = new Error("Рекрутер не найден");
    error.status = 404;
    throw error;
  }

  res.status(200).json({
    recruiter: recruiterPayload(recruiter)
  });
};
