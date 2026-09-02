import { deleteCvFile, saveCvFile, streamCvFile } from "../config/storage.js";
import { CandidateProfile } from "../models/candidate-profile.model.js";
import { CandidateStatus, candidateStatuses } from "../models/candidate-status.model.js";
import { Recruiter } from "../models/recruiter.model.js";
import { ProfileView } from "../models/profile-view.model.js";

const unavailableForWork = "Не ищу работу сейчас";

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
    .split(/[,\s.]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const uniqueTokens = (...values) => {
  return [...new Set(values.flatMap(splitQueryList).map((item) => item.toLocaleLowerCase("ru-RU")))];
};

const searchableText = (profile) => [
  profile.user?.name,
  profile.headline,
  profile.summary,
  profile.location,
  profile.portfolio,
  profile.availability,
  profile.employmentFormat,
  profile.accessibilityPreferences,
  ...(profile.skills ?? []),
  ...(profile.languages ?? [])
]
  .filter(Boolean)
  .join(" ")
  .toLocaleLowerCase("ru-RU");

const searchableWords = (profile) => uniqueTokens(searchableText(profile));

const scoreTokens = (profile, tokens) => {
  if (tokens.length === 0) return 0;

  const text = searchableText(profile);
  const words = searchableWords(profile);
  const exactMatches = tokens.filter((token) => words.includes(token)).length;
  const partialMatches = tokens.filter((token) => text.includes(token)).length;

  if (exactMatches === tokens.length) return 300 + exactMatches;
  if (partialMatches === tokens.length) return 200 + partialMatches;
  if (partialMatches > 0) return 100 + partialMatches;
  return -1;
};

export const listCandidates = async (req, res) => {
  const filters = {
    availability: { $ne: unavailableForWork }
  };
  const location = String(req.query.location ?? "").trim();
  const employmentFormat = String(req.query.employmentFormat ?? "").trim();
  const searchTokens = uniqueTokens(req.query.query, req.query.skills);
  const languageTokens = uniqueTokens(req.query.languages);

  if (location) {
    filters.location = { $regex: location, $options: "i" };
  }

  if (["remote", "office", "hybrid"].includes(employmentFormat)) {
    filters.employmentFormat = employmentFormat;
  }

  const profiles = await CandidateProfile.find(filters)
    .populate("user", "name email role")
    .sort({ updatedAt: -1 });

  const scoredProfiles = profiles
    .map((profile) => {
      const searchScore = scoreTokens(profile, searchTokens);
      const languageScore = scoreTokens(profile, languageTokens);
      return {
        profile,
        score: searchScore + languageScore
      };
    })
    .filter(({ profile }) => {
      if (searchTokens.length > 0 && scoreTokens(profile, searchTokens) < 0) return false;
      if (languageTokens.length > 0 && scoreTokens(profile, languageTokens) < 0) return false;
      return true;
    })
    .sort((left, right) => right.score - left.score || right.profile.updatedAt - left.profile.updatedAt);

  res.status(200).json({
    candidates: scoredProfiles.map(({ profile }) => profilePayload(profile))
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
    await ProfileView.findOneAndUpdate(
      {
        candidate: profile.user.id,
        recruiter: recruiter.id
      },
      {
        $set: {
          viewedBy: req.user.id,
          viewedAt: new Date()
        }
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true
      }
    );
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
  const latestViewsByRecruiter = new Map();

  views.forEach((view) => {
    const recruiterId = view.recruiter?.id ?? view.recruiter?._id?.toString() ?? view.recruiter?.toString();
    if (!recruiterId || latestViewsByRecruiter.has(recruiterId)) return;
    latestViewsByRecruiter.set(recruiterId, view);
  });

  res.status(200).json({
    views: Array.from(latestViewsByRecruiter.values()).map((view) => ({
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
