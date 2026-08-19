import { deleteCvFile, saveCvFile, streamCvFile } from "../config/storage.js";
import { CandidateProfile } from "../models/candidate-profile.model.js";
import { CandidateStatus, candidateStatuses } from "../models/candidate-status.model.js";
import { Recruiter } from "../models/recruiter.model.js";
import { ProfileView } from "../models/profile-view.model.js";

const cvPayload = (cv) => {
  if (!cv?.originalName) return null;

  return {
    originalName: cv.originalName,
    mimeType: cv.mimeType,
    size: cv.size,
    uploadedAt: cv.uploadedAt
  };
};

const profilePayload = (profile) => ({
  id: profile.id,
  user: profile.user,
  headline: profile.headline,
  summary: profile.summary,
  skills: profile.skills,
  languages: profile.languages,
  accessibilityPreferences: profile.accessibilityPreferences,
  portfolio: profile.portfolio,
  availability: profile.availability,
  employmentFormat: profile.employmentFormat || "remote",
  location: profile.location,
  contacts: {
    email: profile.contacts?.email || profile.user?.email,
    messenger: profile.contacts?.messenger || "",
    messengerType: profile.contacts?.messengerType || "telegram"
  },
  cv: cvPayload(profile.cv),
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
  const employmentFormat = String(req.query.employmentFormat ?? "").trim();
  const skills = splitQueryList(req.query.skills);
  const languages = splitQueryList(req.query.languages);

  if (location) {
    filters.location = { $regex: location, $options: "i" };
  }

  if (["remote", "office", "hybrid"].includes(employmentFormat)) {
    filters.employmentFormat = employmentFormat;
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
    const error = new Error("Профиль соискателя не найден");
    error.status = 404;
    throw error;
  }

  const recruiter = await Recruiter.findOne({ owner: req.user.id });

  if (recruiter) {
    await ProfileView.create({
      candidate: profile.user.id,
      recruiter: recruiter.id,
      viewedBy: req.user.id
    });
  }

  res.status(200).json({
    candidate: profilePayload(profile)
  });
};

export const getMyCandidateProfile = async (req, res) => {
  const profile = await CandidateProfile.findOne({ user: req.user.id }).populate("user", "name email role");

  if (!profile) {
    const error = new Error("Профиль соискателя не найден");
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
        portfolio: req.body.portfolio,
        availability: req.body.availability,
        employmentFormat: req.body.employmentFormat,
        location: req.body.location,
        contacts: req.body.contacts
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
    const error = new Error("Файл резюме обязателен");
    error.status = 400;
    throw error;
  }

  const existingProfile = await CandidateProfile.findOne({ user: req.user.id });
  const storedFile = await saveCvFile({
    userId: req.user.id,
    file: req.file
  });

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user.id },
    {
      $set: {
        cv: {
          filename: storedFile.filename,
          storageDriver: storedFile.storageDriver,
          storageKey: storedFile.storageKey,
          bucket: storedFile.bucket,
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

  await deleteCvFile(existingProfile?.cv);

  res.status(200).json({
    candidate: profilePayload(profile)
  });
};

export const downloadCandidateCv = async (req, res) => {
  const profile = await CandidateProfile.findById(req.params.id);

  if (!profile?.cv?.filename) {
    const error = new Error("Резюме не найдено");
    error.status = 404;
    throw error;
  }

  const stream = await streamCvFile(profile.cv);
  const encodedFilename = encodeURIComponent(profile.cv.originalName);

  res.setHeader("Content-Type", profile.cv.mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="resume"; filename*=UTF-8''${encodedFilename}`
  );

  stream.on("error", (error) => {
    if (!res.headersSent) {
      res.status(404).json({ error: { message: "Резюме не найдено", status: 404 } });
      return;
    }

    res.destroy(error);
  });

  stream.pipe(res);
};

export const listMyProfileViews = async (req, res) => {
  const views = await ProfileView.find({ candidate: req.user.id })
    .populate("recruiter", "name website accessibilityCommitments")
    .sort({ viewedAt: -1 })
    .limit(100);

  res.status(200).json({
    views: views.map((view) => ({
      id: view.id,
      recruiter: view.recruiter
        ? {
            id: view.recruiter.id,
            name: view.recruiter.name,
            website: view.recruiter.website,
            accessibilityCommitments: view.recruiter.accessibilityCommitments
          }
        : null,
      viewedAt: view.viewedAt
    }))
  });
};

export const updateCandidateStatus = async (req, res) => {
  const profile = await CandidateProfile.findById(req.params.id);

  if (!profile) {
    const error = new Error("Профиль соискателя не найден");
    error.status = 404;
    throw error;
  }

  const recruiter = await Recruiter.findOne({ owner: req.user.id });

  if (!recruiter) {
    const error = new Error("Заполните профиль рекрутера перед изменением статусов");
    error.status = 400;
    throw error;
  }

  const previousStatus = await CandidateStatus.findOne({
    candidate: profile.user,
    recruiter: recruiter.id
  });

  const status = await CandidateStatus.findOneAndUpdate(
    {
      candidate: profile.user,
      recruiter: recruiter.id
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
    await Recruiter.findByIdAndUpdate(recruiter.id, { $inc: { hiredCandidateCount: 1 } });
  }

  res.status(200).json({
    status: {
      id: status.id,
      candidate: status.candidate,
      recruiter: status.recruiter,
      status: status.status,
      updatedBy: status.updatedBy,
      updatedAt: status.updatedAt
    },
    allowedStatuses: candidateStatuses
  });
};
