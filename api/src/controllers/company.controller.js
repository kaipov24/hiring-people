import { getCacheClient } from "../config/cache.js";
import { Company } from "../models/company.model.js";

const hiredCompaniesCacheKey = "companies:hired";

const companyPayload = (company) => ({
  id: company.id,
  owner: company.owner,
  name: company.name,
  description: company.description,
  website: company.website,
  contacts: {
    email: company.contacts?.email || "",
    phone: company.contacts?.phone || "",
    messenger: company.contacts?.messenger || ""
  },
  accessibilityCommitments: company.accessibilityCommitments,
  hiredCandidateCount: company.hiredCandidateCount,
  createdAt: company.createdAt,
  updatedAt: company.updatedAt
});

export const getMyCompany = async (req, res) => {
  const company = await Company.findOne({ owner: req.user.id });

  if (!company) {
    const error = new Error("Профиль компании не найден");
    error.status = 404;
    throw error;
  }

  res.status(200).json({
    company: companyPayload(company)
  });
};

export const upsertMyCompany = async (req, res) => {
  const company = await Company.findOneAndUpdate(
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

  await getCacheClient().del(hiredCompaniesCacheKey);

  res.status(200).json({
    company: companyPayload(company)
  });
};

export const listCompanies = async (_req, res) => {
  const companies = await Company.find({})
    .sort({ updatedAt: -1, name: 1 })
    .limit(100);

  res.status(200).json({
    companies: companies.map(companyPayload)
  });
};

export const getCompany = async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    const error = new Error("Компания не найдена");
    error.status = 404;
    throw error;
  }

  res.status(200).json({
    company: companyPayload(company)
  });
};

export const listHiredCompanies = async (_req, res) => {
  const cache = getCacheClient();
  const cachedCompanies = await cache.get(hiredCompaniesCacheKey);

  if (cachedCompanies) {
    res.status(200).json({
      companies: JSON.parse(cachedCompanies),
      cached: true
    });
    return;
  }

  const companies = await Company.find({ hiredCandidateCount: { $gt: 0 } })
    .sort({ hiredCandidateCount: -1, name: 1 })
    .limit(12);
  const payload = companies.map(companyPayload);

  await cache.set(hiredCompaniesCacheKey, JSON.stringify(payload), {
    EX: 300
  });

  res.status(200).json({
    companies: payload,
    cached: false
  });
};

export { hiredCompaniesCacheKey };
