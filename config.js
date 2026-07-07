// Firstbite 백엔드 URL 설정
window.FB_BACKEND = "https://firstbite-backend-jc6g.onrender.com";

// ---- Firstbite 경량 마케팅 트래킹 (page_view / scroll depth / CTA 클릭 / 체류시간) ----
(function(){
  var B=window.FB_BACKEND; if(!B) return;
  var sid; try{ sid=sessionStorage.getItem("fb_sid"); if(!sid){ sid=Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem("fb_sid",sid);} }catch(e){ sid="anon"+Date.now(); }
  var t0=Date.now();
  var page=/consulting/.test(location.pathname)?"consulting":(/firstbite/.test(location.pathname)?"firstbite":location.pathname.replace(/\W/g,"")||"home");
  var q=new URLSearchParams(location.search);
  var utm={source:q.get("utm_source")||"",medium:q.get("utm_medium")||"",campaign:q.get("utm_campaign")||""};
  var maxS=0;
  function send(type,val){
    var body=JSON.stringify({sid:sid,page:page,type:type,val:String(val==null?"":val),ref:document.referrer||"",utm:utm,t:Date.now()-t0});
    try{
      if(navigator.sendBeacon){ navigator.sendBeacon(B+"/api/events",new Blob([body],{type:"application/json"})); }
      else{ fetch(B+"/api/events",{method:"POST",headers:{"content-type":"application/json"},body:body,keepalive:true}); }
    }catch(e){}
  }
  window.fbTrack=send;
  window.fbSession=function(){ return {sid:sid,ref:document.referrer||"",utm_source:utm.source,utm_medium:utm.medium,utm_campaign:utm.campaign,maxScroll:maxS,timeOnPageMs:Date.now()-t0}; };
  send("page_view");
  var marks={};
  window.addEventListener("scroll",function(){
    var h=document.documentElement;
    var d=Math.min(100,Math.round((h.scrollTop+window.innerHeight)/h.scrollHeight*100));
    if(d>maxS) maxS=d;
    [25,50,75,100].forEach(function(m){ if(d>=m&&!marks[m]){ marks[m]=1; send("scroll",m); } });
  },{passive:true});
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest('a[href^="consulting"]');
    if(a) send("cta_click");
  });
})();
