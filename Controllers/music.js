const mongoose = require("mongoose");
const moment = require("moment");
const cloudinary = require("cloudinary");
const slugify = require("slugify");
const { google } = require("googleapis");

const mongooseMusic = require("../Model/music");
const mongooseAccount = require("../Model/account");

const { CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, API_KEY } = process.env;

const youtube = google.youtube({
    version: "v3",
    auth: API_KEY,
});
const handleSlug = (name) => slugify(name || "", {
    replacement: "-",
    remove: /[*-+~,.()'"!:@]/g,
    lower: true,
    strip: true,
    locale: "vi",
    trim: true,
});

class ApiFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }
    sorting() {
        this.query = this.query.sort("-createdAt");
        return this;
    }
}



cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

function matchYoutubeUrl(url) {
    const p =
        /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const matches = url.match(p);
    if (matches) {
        return matches[1];
    }
    return false;
}


module.exports = {
    CREATE_MUSIC: async (req, res) => {
        try {
            const create_music = moment().format();
            const { id } = req;
            const music = JSON.parse(req.body.upload);
            const src_music = req.files["src_music"][0];
            const image_music = req.files["image_music"][0];
            const account = await mongooseAccount.findById(id);
            if (!account)
                return res.status(401).json({ messages: "account not found" });
            const id_youtube = matchYoutubeUrl(music.link_mv);
            if (id_youtube) {
                const response_youtube = await youtube.videos.list({
                    id: id_youtube,
                    part: "statistics",
                });
                const { data } = response_youtube;
                const { items } = data;
                const { viewCount, likeCount } = items[0].statistics;
                // Bảo Uyên, RIN9, DREAMeR
                const resultImageMusic = await cloudinary.v2.uploader.upload(
                    image_music.path,
                    { folder: "image_music" }
                );
                const resultMusic = await cloudinary.v2.uploader.upload(
                    src_music.path,
                    { resource_type: "video", folder: "audio" }
                );
                if (resultImageMusic && resultMusic) {
                    const time = format(resultMusic.duration);
                    const new_music = new mongooseMusic({
                        _id: new mongoose.Types.ObjectId(),
                        id_account: id,
                        name_singer: music.name_singer.trim(),
                        slug_name_singer: handleSlug(music.name_singer),
                        src_music: resultMusic.secure_url,
                        link_mv: id_youtube,
                        image_music: resultImageMusic.secure_url,
                        time_format: time,
                        seconds: resultMusic.duration,
                        name_music: music.name_music.trim(),
                        slug_name_music: handleSlug(music.name_music),
                        category: music.category.trim(),
                        view: Number(viewCount),
                        favorite: likeCount ? Number(likeCount) : Number(viewCount) / 4,
                        slug_category: handleSlug(music.category),
                        subscribe: music.name_singer.trim(),
                        slug_subscribe: handleSlug(music.name_singer),
                        createdAt: create_music,
                        updatedAt: create_music,
                    });
                    const result = await new_music.save();
                    res.json({
                        data: result,
                    });
                } else {
                    res.status(500).json({
                        message: "Link youtube not format",
                    });
                }
            }
        } catch (error) {
            res.status(401).json({
                message: error,
            });
        }
    },
    EDIT_MUSIC: async (req, res) => {
        try {
            const { id } = req;
            const imageMusicOld = req.body.image_music;
            const SrcMusicOld = req.body.src_music;
            const music = JSON.parse(req.body.upload);
            const srcMusicNew = req.files["src_music"];
            const imageMusicNew = req.files["image_music"];
            const account = await mongooseAccount.findById(id);
            const id_youtube = matchYoutubeUrl(music.link_mv);
            if (!account)
                return res.status(401).json({ messages: "account not found" });
            const response_youtube = await youtube.videos.list({
                id: id_youtube,
                part: "statistics",
            });
            const { data } = response_youtube;
            const { items } = data;
            const { viewCount, likeCount } = items[0].statistics;
            if (id_youtube) {
                if (srcMusicNew && !imageMusicNew) {
                    const resultMusic = await cloudinary.v2.uploader.upload(
                        srcMusicNew[0].path,
                        { resource_type: "video", folder: "audio" }
                    );
                    if (resultMusic) {
                        const result = await updateMusic({
                            ...music,
                            link_mv: id_youtube,
                            src_music: resultMusic.secure_url,
                            image_music: imageMusicOld,
                        });
                        res.json({
                            data: result,
                        });
                    }
                }

                if (!srcMusicNew && imageMusicNew) {
                    const resultImageMusic = await cloudinary.v2.uploader.upload(
                        imageMusicNew[0].path,
                        { folder: "image_music" }
                    );
                    if (resultImageMusic) {
                        const result = await updateMusic({
                            ...music,
                            view: Number(viewCount),
                            favorite: likeCount ? Number(likeCount) : Number(viewCount) / 4,
                            link_mv: id_youtube,
                            image_music: resultImageMusic.secure_url,
                            src_music: SrcMusicOld,
                        });
                        res.json({
                            data: result,
                        });
                    }
                }

                if (srcMusicNew && imageMusicNew) {
                    const resultImageMusic = await cloudinary.v2.uploader.upload(
                        imageMusicNew[0].path,
                        { folder: "image_music" }
                    );
                    const resultMusic = await cloudinary.v2.uploader.upload(
                        srcMusicNew[0].path,
                        { resource_type: "video", folder: "audio" }
                    );
                    if (resultMusic && resultImageMusic) {
                        const result = await updateMusic({
                            ...music,
                            view: Number(viewCount),
                            favorite: likeCount ? Number(likeCount) : Number(viewCount) / 4,
                            link_mv: id_youtube,
                            image_music: resultImageMusic.secure_url,
                            src_music: resultMusic.secure_url,
                        });
                        res.json({
                            data: result,
                        });
                    }
                }

                if (!srcMusicNew && !imageMusicNew) {
                    const result = await updateMusic({
                        ...music,
                        view: Number(viewCount),
                        favorite: likeCount ? Number(likeCount) : Number(viewCount) / 4,
                        link_mv: id_youtube,
                        image_music: imageMusicOld,
                        src_music: SrcMusicOld,
                    });
                    res.json({
                        data: result,
                    });
                }
            } else {
                res.status(500).json({
                    message: "Link youtube not format",
                });
            }
        } catch (error) {
            res.status(401).json({
                message: error,
            });
        }
    },
    GET_MUSIC_ACCOUNT: async (req, res) => {
        try {
            const { id } = req;
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;

            const account = await mongooseAccount.findById(id);
            if (!account)
                return res.status(400).json({ message: "no found account" });
            const features = new ApiFeatures(
                mongooseMusic.find({ id_account: id }),
                req.query
            ).sorting();
            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (err) {
            console.log(err);
        }
    },
    GET_BY_ID: async (req, res) => {
        try {
            const { _id } = req.query;
            const music = await mongooseMusic.findById(_id);
            if (!music) return res.status(404).json({ message: "music not found" });
            const response_youtube = await youtube.videos.list({
                id: music.link_mv,
                part: "statistics",
            });
            const { data } = response_youtube;
            const { items } = data;

            if (items.length) {
                const { viewCount, likeCount } = items[0].statistics;
                const result = await mongooseMusic.findByIdAndUpdate(
                    _id,
                    {
                        view: music.view + 1,
                        view: Number(viewCount),
                        favorite: likeCount ? Number(likeCount) : Number(viewCount) / 4,
                    },
                    { new: true }
                );
                res.json({
                    message: "success",
                    data: result,
                });
            } else {
                const result = await mongooseMusic.findByIdAndUpdate(
                    _id,
                    { view: music.view + 1 },
                    { new: true }
                );
                res.json({
                    message: "success",
                    data: result,
                });
            }

        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    GET_NAME_SINGER: async (req, res) => {
        try {
            const { _singer } = req.query;
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const features = new ApiFeatures(
                mongooseMusic.find({ slug_subscribe: handleSlug(_singer) }),
                req.query
            ).sorting();
            const result = await features.query;
            if (!result.length)
                return res.status(404).json({ message: "music not found" });
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    GET_CATEGORY: async (req, res) => {
        try {
            const { category } = req.query;
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const features = new ApiFeatures(
                mongooseMusic.find({ slug_category: handleSlug(category) }),
                req.query
            ).sorting();

            const result = await features.query;
            if (!result.length)
                return res.status(404).json({ message: "music not found" });
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    GET_NAME_MUSIC: async (req, res) => {
        try {
            const { _name } = req.query;
            const result = await mongooseMusic.findOne({ slug_name_music: handleSlug(_name) });
            if (!result) return res.status(404).json({ message: "music not found" });
            res.json({
                message: "success",
                data: result,
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    NEW_MUSIC: async (req, res) => {
        try {
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const features = new ApiFeatures(
                mongooseMusic.find(),
                req.query
            ).sorting();
            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    TRENDING_MUSIC: async (req, res) => {
        try {
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const features = new ApiFeatures(
                mongooseMusic.find().sort({ view: -1 }),
                req.query
            );
            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },

    TOP_VIEWS: async (req, res) => {
        try {
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const _type = req.query._type || "million";
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            let features;

            if (_type !== "million" && _type !== "billion") {
                return res.status(400).json({
                    message: "type not found",
                    _type: "million or billion",
                    default: "million",
                    query: "?_type=million",
                });
            }
            if (_type === "million") {
                features = new ApiFeatures(
                    mongooseMusic.find({ view: { $gte: 1000000, $lte: 999999999 } }).sort({ view: -1 }),
                    req.query
                );
            };
            if (_type === "billion") {
                features = new ApiFeatures(
                    mongooseMusic.find({ view: { $gte: 1000000000 } }).sort({ view: -1 }),
                    req.query
                );
            }

            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },

    TOP_FAVORITE: async (req, res) => {
        try {
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const _type = req.query._type || "million";
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            let features;

            if (_type !== "million" && _type !== "billion") {
                return res.status(400).json({
                    message: "type not found",
                    _type: "million or billion",
                    default: "million",
                    query: "?_type=million",
                });
            }
            if (_type === "million") {
                features = new ApiFeatures(
                    mongooseMusic.find({ favorite: { $gte: 1000000, $lte: 999999999 } }).sort({ favorite: -1 }),
                    req.query
                );
            }
            if (_type === "billion") {
                features = new ApiFeatures(
                    mongooseMusic.find({ favorite: { $gte: 1000000000 } }).sort({ favorite: -1 }),
                    req.query
                );
            }

            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    FAVORITE_MUSIC: async (req, res) => {
        try {
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const features = new ApiFeatures(
                mongooseMusic.find().sort({ favorite: -1 }),
                req.query
            );
            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    DELETE_BY_ID: async (req, res) => {
        try {
            const { id } = req;
            const { _id } = req.query;
            const account = await mongooseAccount.findById(id);
            if (!account) return res.status(404).json({ message: "account not found" });
            const music = await mongooseMusic.findByIdAndDelete(_id);
            if (!music) return res.status(404).json({ message: "music not found" });
            res.json({
                _id,
                data: music
            });
        } catch (error) {
            res.json({
                message: error,
            });
        }
    },
    SEARCH: async (req, res) => {
        try {
            const { id } = req;
            const query =
                handleSlug(req.query.query) ||
                "";
            const account = await mongooseAccount.findById(id);
            if (!account) return res.status(404).json({ message: "account not found" });
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const queryString = {
                id_account: id,
                $or: [
                    { slug_name_music: { $regex: query, $options: "$i" } },
                ],
            };
            const features = new ApiFeatures(
                mongooseMusic.find(queryString),
                req.query
            ).sorting();
            const result = await features.query;
            res.json({
                pagination: {
                    _limit: _limit,
                    _page: _page,
                    _total: result.length,
                },
                data: result.slice(start, end),
            });
        } catch (error) {
            res.status(500).json({
                error: error,
            });
        }
    }
};

const format = (seconds) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = pad(date.getUTCSeconds());
    if (hh) {
        return `${hh}:${pad(mm)}:${ss}`;
    }
    return `${mm}:${ss}`;
};

const pad = (string) => ("0" + string).slice(-2);

const updateMusic = async ({
    name_music,
    name_singer,
    category,
    link_mv,
    src_music,
    image_music,
    _id,
}) => {
    const updatedAt = moment().format();
    const upload = {
        name_music: name_music.trim(),
        name_singer: name_singer.trim(),
        category: category.trim(),
        link_mv,
        src_music,
        image_music,
        updatedAt,
        slug_subscribe: handleSlug(name_singer),
        slug_name_singer: handleSlug(name_singer),
        subscribe: name_singer.trim(),
        slug_category: handleSlug(category),
        slug_name_music: handleSlug(name_music),
    };
    const resMusic = await mongooseMusic.findByIdAndUpdate(_id, upload, {
        new: true,
    });
    return resMusic;
};
