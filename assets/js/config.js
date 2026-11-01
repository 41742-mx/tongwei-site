/**
 * 同伟工贸官网 · 全站配置
 *
 * 说明：
 * - 电话/微信暂时留空，页面显示占位文案，演示版不生成假的 tel: 链接。
 * - 正式上线前只改这里，不要在 8 个 HTML 里分别改联系方式。
 * - formEndpoint 为空时，询价表单进入演示模式，不发送网络请求。
 */
window.SITE_CONFIG = {
  companyName: "高唐县同伟工贸有限公司",
  shortName: "同伟工贸",
  contactName: "李经理",

  phone: "",
  phoneDisplay: "xxx（待补充）",

  wechatId: "",
  wechatQr: "assets/img/wechat-qr-placeholder.svg",

  address: "山东省聊城市高唐县梁村镇李化梓村南段路东",
  hours: "周一至周六 8:00–18:00",
  founded: "2008",
  serviceArea: "高唐县及聊城周边，周边县市可发物流",

  mapQuery: "山东省聊城市高唐县梁村镇李化梓村南段路东",

  formEndpoint: "",
  demoMode: true
};
