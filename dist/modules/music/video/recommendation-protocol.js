"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.biliRecommendationRows = biliRecommendationRows;
exports.douyinRecommendationRows = douyinRecommendationRows;
// 推荐只接受普通视频；不将广告、直播、图文或未知类型伪装成可播放条目。
function biliRecommendationRows(data) {
    if (data?.code !== 0)
        throw Object.assign(new Error(data?.message || 'B站推荐读取失败'), { state: data?.code === -101 ? 'login_required' : [-352, -412].includes(data?.code) ? 'risk_controlled' : 'unavailable', statusCode: 422 });
    if (!Array.isArray(data?.data?.item))
        throw Object.assign(new Error('B站推荐响应格式暂不支持'), { state: 'capability_unavailable', statusCode: 422 });
    return data.data.item.filter(row => row.goto === 'av' && /^BV[a-zA-Z0-9]{10}$/.test(row.bvid || '') && !row.business_info && !row.ad_info).map(row => ({ type: 'bilibili', sourceId: row.bvid, bvid: row.bvid, title: row.title, author: row.owner?.name || '', pic: row.pic, duration: row.duration }));
}
function douyinRecommendationRows(data) {
    if (data?.status_code !== 0)
        throw Object.assign(new Error('抖音推荐需要在官方窗口完成验证后重试'), { state: 'risk_controlled', statusCode: 422 });
    if (!Array.isArray(data.aweme_list))
        throw Object.assign(new Error('抖音推荐响应格式暂不支持'), { state: 'capability_unavailable', statusCode: 422 });
    return data.aweme_list.filter(row => [0, 4, 51].includes(row.aweme_type) && /^\d{10,24}$/.test(row.aweme_id || '') && row.video?.play_addr?.url_list?.length && !row.is_ads && !row.ad_info && !row.raw_ad_data && !row.image_post_info && (!Array.isArray(row.images) || !row.images.length));
}
//# sourceMappingURL=recommendation-protocol.js.map