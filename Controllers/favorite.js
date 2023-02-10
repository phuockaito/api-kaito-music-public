const mongoose = require("mongoose");
const moment = require("moment");

const mongooseAccount = require("../Model/account");
const mongooseMusic = require("../Model/music");
const mongooseFavorite = require("../Model/favorite");

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

module.exports = {
    CREATE: async (req, res) => {
        try {
            const create = moment().format();
            const { id } = req;
            const { idMusic } = req.body;
            const account = await mongooseAccount.findById(id);
            const music = await mongooseMusic.findById(idMusic);
            if (!account) return res.status(404).json({ message: "Account not found" });
            if (!music) return res.status(404).json({ message: "Music not found" });
            const list_favorite = music.account_favorite;

            const new_account = {
                image: account.image,
                role: account.role,
                createdAt: create,
                _id: account._id,
                user_name: account.user_name,
                id_music: idMusic,
            }

            const checkFavorite = await mongooseFavorite.find({ id_music: idMusic, id_account: id });
            if (checkFavorite.length === 0) {
                const account_favorite = [...list_favorite, new_account];
                const new_music = await mongooseMusic.findByIdAndUpdate(
                    idMusic,
                    { favorite: music.favorite + 1, account_favorite: account_favorite },
                    { new: true }
                );
                const newFavorite = new mongooseFavorite({
                    _id: new mongoose.Types.ObjectId(),
                    id_music: idMusic,
                    id_account: id,
                    music: new_music,
                    createdAt: create,
                    updatedAt: create,
                });
                const result = await newFavorite.save();
                res.status(200).json({
                    data: result.music,
                    id_music: idMusic,
                    account_favorite: account_favorite,
                    message: "Create favorite success",
                });
            } else {
                const resultFavorite = list_favorite.filter((item) => item._id.toString() !== id);
                const new_music = await mongooseMusic.findByIdAndUpdate(
                    idMusic,
                    { favorite: music.favorite - 1, account_favorite: resultFavorite },
                    { new: true }
                );
                await mongooseFavorite.findByIdAndDelete([checkFavorite[0]._id]);
                res.status(200).json({
                    data: {
                        ...new_music._doc
                    },
                    id_music: idMusic,
                    account_favorite: resultFavorite,
                    message: "Delete favorite success",
                });
            }
        } catch (error) {
            res.status(400).json({ message: error });
            console.log(error);
        }
    },
    GET_BY_TOKEN: async (req, res) => {
        try {
            const { id } = req;
            const _page = req.query._page * 1 || 1;
            const _limit = req.query._limit * 1 || 20;
            const start = (_page - 1) * _limit;
            const end = start + _limit;
            const account = await mongooseAccount.findById(id);
            if (!account)
                return res.status(404).json({ message: "Account not found" });
            const features = new ApiFeatures(
                mongooseFavorite.find({ id_account: id }),
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
            res.status(400).json({ message: error });
        }
    },
    DELETE_BY_ID: async (req, res) => {
        try {
            const { id } = req;
            const { _id } = req.query;
            const account = await mongooseAccount.findById(id);
            const favorite = await mongooseFavorite.findById(_id);
            const idMusic = favorite.id_music;
            const music = await mongooseMusic.findById(idMusic);
            if (!account)
                return res.status(404).json({ message: "Account not found" });
            if (!favorite)
                return res.status(404).json({ message: "Favorite not found" });
            await mongooseMusic.findByIdAndUpdate(
                idMusic,
                { favorite: music.favorite - 1 },
                { new: true }
            );
            const result = await mongooseFavorite.findByIdAndDelete(_id);
            res.status(200).json({
                message: "Delete success",
                id: _id,
                data: result,
            });
        } catch (error) {
            res.status(400).json({ message: error });
        }
    },
};
