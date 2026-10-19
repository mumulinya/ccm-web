"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFoliaWrite = requireFoliaWrite;
exports.providerOperationWrites = providerOperationWrites;
const local_auth_1 = require("../../system/local-auth");
// 上游部分修改接口使用 GET；仍按写操作执行 CCM 权限和 CSRF 检查。
function requireFoliaWrite(req) {
    const auth = req.ccmAuth;
    if (auth?.kind !== 'browser')
        return;
    if (auth.readOnly || !['admin', 'operator'].includes(auth.role))
        throw Object.assign(new Error('当前账号没有音乐修改权限'), { statusCode: 403 });
    const writeRequest = Object.create(req);
    writeRequest.method = 'POST';
    if (!(0, local_auth_1.verifyBrowserCsrf)(writeRequest))
        throw Object.assign(new Error('安全令牌无效，请刷新页面重试'), { statusCode: 403 });
}
const operations = {
    netease: {
        read: '/toplist /search /cloudsearch /song/detail /song/copyright/rcmd /login/status /user/account /user/detail /user/playlist /playlist/track/all /playlist/detail /album/sublist /artist/detail /artist/album /artist/top/song /artist/songs /song/url/v1 /song/url /lyric/new /song/chorus /cloud/lyric/get /user/cloud /user/cloud/detail /personal/fm /personal/fm/mode /recommend/songs /history/recommend/songs /history/recommend/songs/detail /playlist/detail/dynamic /album/detail/dynamic /album /likelist',
        write: '/register/anonimous /login/qr/key /login/qr/create /login/qr/check /logout /scrobble/v1 /playlist/tracks /recommend/songs/dislike /playlist/subscribe /album/sub /like /playlist/create /playlist/delete /playlist/update /comment /follow /user/update',
    },
    qq: {
        read: '/getTopLists /getRanks /search /login/status /login/channels /user/detail /user/playlist /user/albums /user/liked-songs /user/playlist-detail /getMusicPlay /getSongListDetail /getSongInfo /getAlbumInfo /getSingerAlbum /getSingerHotsong /user/guess-you-like /user/daily-songs /recommend/playlists /user/subscription-status',
        write: '/login/qr/key /login/qr/create /login/qr/check /login/qr/cancel /logout /user/playlist/tracks /user/playlist/subscribe /user/song/like /user/album/subscribe',
    },
    kugou: {
        read: '/rank/list /rank/audio /user/detail /user/vip/detail /user/playlist /user/cloud /user/cloud/url /search /audio /krm/audio /song/url /song/climax /search/lyric /lyric /playlist/track/all /playlist/detail /album/detail /album/songs /artist/detail /artist/albums /artist/audios /everyday/recommend /everyday/history /personal/fm /top/card/youth',
        write: '/register/dev /login/qr/key /login/qr/create /login/qr/check /logout /youth/union/vip /youth/day/vip /youth/day/vip/upgrade /playlist/add /playlist/del /playlist/tracks/add /playlist/tracks/del /artist/follow',
    },
    navidrome: {
        read: '/ping /getOpenSubsonicExtensions /getUser /getMusicFolders /getLicense /getAlbumList2 /getAlbum /getPlaylists /getPlaylist /getRandomSongs /getStarred2 /getArtists /getArtist /getSong /stream /getCoverArt /getLyrics /getLyricsBySongId /search3',
        write: '/star /unstar /scrobble /createPlaylist /deletePlaylist /updatePlaylist',
    },
};
// 未声明的上游接口不可透传；GET 也按明确的操作元数据执行权限检查。
function providerOperationWrites(endpoint, provider = 'netease') {
    const route = endpoint.replace(/\.view$/, ''), metadata = operations[provider];
    if (metadata?.write.split(' ').includes(route))
        return true;
    if (metadata?.read.split(' ').includes(route))
        return false;
    throw Object.assign(new Error('不支持的音源操作'), { statusCode: 404 });
}
//# sourceMappingURL=authorization.js.map