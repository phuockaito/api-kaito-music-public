const express = require("express");
const router = express.Router();

const { authorizationToken } = require('../helpers/jwt_helpers');
const musicController = require("../Controllers/music");
const upload = require('../multer');

router.post('/create', upload.fields([{ name: 'src_music', maxCount: 1 }, { name: 'image_music', maxCount: 1 }]), authorizationToken, musicController.CREATE_MUSIC);
router.put('/edit', upload.fields([{ name: 'src_music', maxCount: 1 }, { name: 'image_music', maxCount: 1 }]), authorizationToken, musicController.EDIT_MUSIC);
router.get('/get-by-id', musicController.GET_BY_ID);
router.get('/get-singer-name', musicController.GET_NAME_SINGER);
router.get('/get-music-name', musicController.GET_NAME_MUSIC);
router.get('/get-category', musicController.GET_CATEGORY);
router.get('/new-music', musicController.NEW_MUSIC);
router.get('/trending', musicController.TRENDING_MUSIC);
router.get('/favorite', musicController.FAVORITE_MUSIC);
router.get('/top-views', musicController.TOP_VIEWS);
router.get('/top-favorite', musicController.TOP_FAVORITE);
router.get('/get-upload', authorizationToken, musicController.GET_MUSIC_ACCOUNT);
router.get('/get-upload/search', authorizationToken, musicController.SEARCH);
router.delete('/delete-by-id', authorizationToken, musicController.DELETE_BY_ID);

module.exports = router;
