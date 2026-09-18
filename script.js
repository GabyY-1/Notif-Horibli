const notifications=document.getElementById("notifications");
let allNotifications=[];
let currentFilter="all";

const labels={nouveaute:"Nouveauté",notification:"Notification",information:"Information"};

function formatDate(value){
  return new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}

function render(){
  const list=currentFilter==="all"?allNotifications:allNotifications.filter(item=>item.type===currentFilter);
  if(!list.length){
    notifications.innerHTML='<div class="state">Aucune publication pour le moment.</div>';
    return;
  }
  notifications.innerHTML=list.map(item=>{
    const itemLinks=Array.isArray(item.links)&&item.links.length
      ?item.links
      :(item.link?[{label:"Ouvrir le lien",url:item.link}]:[]);
    return `
    <article class="card ${item.important?"important":""}">
      <div class="card-top">
        <span class="badge">${labels[item.type]||"Information"}${item.important?" · Important":""}</span>
        <span class="date">${formatDate(item.created_at)}</span>
      </div>
      <h2><a href="annonce.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></h2>
      <p>${escapeHtml(item.description)}</p>
      ${itemLinks.length?'<div class="card-links">'+itemLinks.map(link=>`<a class="card-link" href="${escapeAttr(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label||"Ouvrir le lien")}</a>`).join("")+"</div>":""}
    </article>`;
  }).join("");
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function escapeAttr(value){return escapeHtml(value)}

async function load(){
  const {data,error}=await supabaseClient.from("notifications").select("*").eq("published",true).order("created_at",{ascending:false});
  if(error){notifications.innerHTML='<div class="state">Impossible de charger les notifications.</div>';return}
  allNotifications=data||[];
  render();
}

document.querySelectorAll(".filter").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(item=>item.classList.remove("active"));
  button.classList.add("active");
  currentFilter=button.dataset.filter;
  render();
}));

load();

async function requestNotifications(){
  if(!("Notification" in window)||Notification.permission!=="default")return;
  try{
    const permission=await Notification.requestPermission();
    if(permission==="granted")new Notification("Notif Horibli",{body:"Les notifications sont activées sur cet ordinateur."});
  }catch{}
}

requestNotifications();
window.addEventListener("click",requestNotifications,{once:true});

supabaseClient.channel("notif-horibli-live")
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"published=eq.true"},payload=>{
    const item=payload.new;
    if(!item)return;
    allNotifications=[item,...allNotifications];
    render();
    if("Notification" in window&&Notification.permission==="granted"){
      new Notification(item.title,{body:item.description.slice(0,180),tag:item.id});
    }
  })
  .subscribe();
