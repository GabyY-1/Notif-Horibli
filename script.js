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
  notifications.innerHTML=list.map(item=>`
    <article class="card ${item.important?"important":""}">
      <div class="card-top">
        <span class="badge">${labels[item.type]||"Information"}${item.important?" · Important":""}</span>
        <span class="date">${formatDate(item.created_at)}</span>
      </div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description)}</p>
      ${item.link?`<a class="card-link" href="${escapeAttr(item.link)}" target="_blank" rel="noopener">Ouvrir le lien</a>`:""}
    </article>`).join("");
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