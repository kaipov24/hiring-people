import path from "node:path";

import { getCacheClient } from "../config/cache.js";
import { uploadRoot } from "../config/uploads.js";
import { hiredCompaniesCacheKey } from "./company.controller.js";
import { CandidateProfile } from "../models/candidate-profile.model.js";
import { CandidateStatus, candidateStatuses } from "../models/candidate-status.model.js";
import { Company } from "../models/company.model.js";
import { ProfileView } from "../models/profile-view.model.js";

const profilePayload = (profile) => ({
  id: profile.id,
  user: profile.user,
  headline: profile.headline,
  summary: profile.summary,
  skills: profile.skills,
  languages: profile.languages,
  accessibilityPreferences: profile.accessibilityPreferences,
  location: profile.location,
  cv: profile.cv,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});

const splitQueryList = (value) => {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const listCandidates = async (req, res) => {
  const filters = {};
  const location = String(req.query.location ?? "").trim();
  const skills = splitQueryList(req.query.skills);
  const languages = splitQueryList(req.query.languages);

  if (location) {
    filters.location = { $regex: location, $options: "i" };
  }

  if (skills.length > 0) {
    filters.skills = { $all: skills.map((skill) => new RegExp(`^${escapeRegex(skill)}$`, "i")) };
  }

  if (languages.length > 0) {
    filters.languages = {
      $all: languages.map((language) => new RegExp(`^${escapeRegex(language)}$`, "i"))
    };
  }

  const profiles = await CandidateProfile.find(filters)
    .populate("user", "name email role")
    .sort({ updatedAt: -1 });

  res.status(200).json({
    candidates: profiles.map(profilePayload)
  });
};

export const getCandidate = async (req, res) => {
  const profile = await CandidateProfile.findById(req.params.id).populate("user", "name email role");

  if (!profile) {
    const error = new Error("Candidate profile not found");
    error.status = 404;
    throw error;
  }

  const company = await Company.findOne({ owner: req.user.id });

  if (!company) {
    const error = new Error("Company profile is required before viewing candidates");
    error.status = 400;
    throw error;
  }

  await ProfileView.create({
    candidate: profile.user.id,
    company: company.id,
    viewedBy: req.user.id
  });

  res.status(200).json({
    candidate: profilePayload(profile)
  });
};

export const getMyCandidateProfile = async (req, res) => {
  const profile = await CandidateProfile.findOne({ user: req.user.id }).populate("user", "name email role");

  if (!profile) {
    const error = new Error("Candidate profile not found");
    error.status = 404;
    throw error;
  }

  res.status(200).json({
    candidate: profilePayload(profile)
  });
};

export const upsertMyCandidateProfile = async (req, res) => {
  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user.id },
    {
      $set: {
        headline: req.body.headline,
        summary: req.body.summary,
        skills: req.body.skills,
        languages: req.body.languages,
        accessibilityPreferences: req.body.accessibilityPreferences,
        location: req.body.location
      }
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true
    }
  ).populate("user", "name email role");

  res.status(200).json({
    candidate: profilePayload(profile)
  });
};

export const uploadMyCv = async (req, res) => {
  if (!req.file) {
    const error = new Error("CV file is required");
    error.status = 400;
    throw error;
  }

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user.id },
    {
      $set: {
        cv: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date()
        }
      }
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true
    }
  ).populate("user", "name email role");

  res.status(200).json({
    candidate: profilePayload(profile)
  });
};

export const downloadCandidateCv = async (req, res) => {
  const profile = await CandidateProfile.findById(req.params.id);

  if (!profile?.cv?.filename) {
    const error = new Error("CV not found for candidate profile");
    error.status = 404;
    throw error;
  }

  const cvPath = path.resolve(uploadRoot, profile.cv.filename);

  res.download(cvPath, profile.cv.originalName);
};

export const listMyProfileViews = async (req, res) => {
  const views = await ProfileView.find({ candidate: req.user.id })
    .populate("company", "name website accessibilityCommitments")
    .sort({ viewedAt: -1 })
    .limit(100);

  res.status(200).json({
    views: views.map((view) => ({
      id: view.id,
      company: view.company,
      viewedAt: view.viewedAt
    }))
  });
};

export const updateCandidateStatus = async (req, res) => {
  const profile = await CandidateProfile.findById(req.params.id);

  if (!profile) {
    const error = new Error("Candidate profile not found");
    error.status = 404;
    throw error;
  }

  const company = await Company.findOne({ owner: req.user.id });

  if (!company) {
    const error = new Error("Company profile is required before updating candidate statuses");
    error.status = 400;
    throw error;
  }

  const previousStatus = await CandidateStatus.findOne({
    candidate: profile.user,
    company: company.id
  });

  const status = await CandidateStatus.findOneAndUpdate(
    {
      candidate: profile.user,
      company: company.id
    },
    {
      $set: {
        status: req.body.status,
        updatedBy: req.user.id
      }
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true
    }
  );

  if (previousStatus?.status !== "Hired" && req.body.status === "Hired") {
    await Company.findByIdAndUpdate(company.id, { $inc: { hiredCandidateCount: 1 } });
    await getCacheClient().del(hiredCompaniesCacheKey);
  }

  res.status(200).json({
    status: {
      id: status.id,
      candidate: status.candidate,
      company: status.company,
      status: status.status,
      updatedBy: status.updatedBy,
      updatedAt: status.updatedAt
    },
    allowedStatuses: candidateStatuses
  });
};
