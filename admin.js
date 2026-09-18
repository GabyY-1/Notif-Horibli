document.addEventListener("DOMContentLoaded",()=>{
  const loginPanel=document.getElementById("loginPanel");
  const adminPanel=document.getElementById("adminPanel");
  const loginMessage=document.getElementById("loginMessage");
  const adminMessage=document.getElementById("adminMessage");
  const adminNotifications=document.getElementById("adminNotifications");
  const links=document.getElementById("links");

  if(!loginPanel||!adminPanel||!links)return;

  const labels={nouveaute:"Nouveauté",notification:"Notification",information:"Information"};

  function message(element,text){
    if(element)element.textContent=text;
  }

  function formatDate(value){
    return new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  }

  function addLinkRow(){
    const row=document.createElement("div");
    row.className="link-row";
    row.innerHTML='<input class="link-label" placeholder="Nom du lien (optionnel)"><input class="link-url" type="url" placeholder="https://..." required><button type="button" class="secondary remove-link">Retirer</button>';
    links.appendChild(row);
  }

  document.addEventListener("click",event=>{
    if(event.target.closest("#addLink")){
      event.preventDefault();
      addLinkRow();
      return;
    }

    const removeButton=event.target.closest(".remove-link");
    if(!removeButton)return;

    event.preventDefault();
    const rows=links.querySelectorAll(".link-row");
    if(rows.length===1){
      rows[0].querySelector(".link-label").value="";
      rows[0].querySelector(".link-url").value="";
      return;
    }
    removeButton.closest(".link-row").remove();
  });

  async function loadAdmin(){
    const {data,error}=await supabaseClient.from("notifications").select("*").order("created_at",{ascending:false});
    if(error){
      adminNotifications.innerHTML='<div class="state">Accès administrateur requis.</div>';
      return;
    }
    if(!data.length){
      adminNotifications.innerHTML='<div class="state">Aucune publication.</div>';
      return;
    }
    adminNotifications.innerHTML=data.map(item=>{
      const itemLinks=Array.isArray(item.links)&&item.links.length
        ?item.links
        :(item.link?[{label:"Ouvrir le lien",url:item.link}]:[]);
      return `<article class="card admin-card">
        <div class="card-top">
          <span class="badge">${labels[item.type]||"Information"} · ${item.published?"Publiée":"Brouillon"}${item.important?" · Important":""}</span>
          <span class="date">${formatDate(item.created_at)}</span>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description)}</p>
        ${itemLinks.length?'<div class="card-links">'+itemLinks.map(link=>`<a class="card-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label||"Ouvrir le lien")}</a>`).join("")+"</div>":""}
        <div class="card-actions"><button class="danger" data-delete="${item.id}">Supprimer</button></div>
      </article>`;
    }).join("");
  }

  async function showSession(session){
    if(session){
      loginPanel.classList.add("hidden");
      adminPanel.classList.remove("hidden");
      document.getElementById("account").textContent=session.user.email||"Compte connecté";
      await loadAdmin();
    }else{
      adminPanel.classList.add("hidden");
      loginPanel.classList.remove("hidden");
    }
  }

  document.getElementById("loginForm").addEventListener("submit",async event=>{
    event.preventDefault();
    message(loginMessage,"Connexion...");
    const {data,error}=await supabaseClient.auth.signInWithPassword({
      email:document.getElementById("email").value.trim(),
      password:document.getElementById("password").value
    });
    if(error){
      message(loginMessage,"Connexion impossible.");
      return;
    }
    await showSession(data.session);
    message(loginMessage,"");
  });

  document.getElementById("logout").addEventListener("click",async()=>{
    await supabaseClient.auth.signOut();
    showSession(null);
  });

  document.getElementById("notificationForm").addEventListener("submit",async event=>{
    event.preventDefault();
    message(adminMessage,"Publication...");

    const notificationLinks=[...links.querySelectorAll(".link-row")].map(row=>({
      label:row.querySelector(".link-label").value.trim()||"Ouvrir le lien",
      url:row.querySelector(".link-url").value.trim()
    })).filter(item=>item.url);

    const {error}=await supabaseClient.from("notifications").insert({
      title:document.getElementById("title").value.trim(),
      type:document.getElementById("type").value,
      description:document.getElementById("description").value.trim(),
      link:notificationLinks[0]?.url||null,
      links:notificationLinks,
      important:document.getElementById("important").checked,
      published:document.getElementById("published").checked
    });

    if(error){
      message(adminMessage,"Publication refusée. Vérifie les droits administrateur.");
      return;
    }

    event.target.reset();
    links.innerHTML='<div class="link-row"><input class="link-label" placeholder="Nom du lien (optionnel)"><input class="link-url" type="url" placeholder="https://..." required><button type="button" class="secondary remove-link">Retirer</button></div>';
    document.getElementById("published").checked=true;
    message(adminMessage,"Publication créée.");
    loadAdmin();
  });

  adminNotifications.addEventListener("click",async event=>{
    const button=event.target.closest("[data-delete]");
    if(!button)return;
    if(!confirm("Supprimer cette publication ?"))return;
    const {error}=await supabaseClient.from("notifications").delete().eq("id",button.dataset.delete);
    if(error){
      message(adminMessage,"Suppression impossible.");
      return;
    }
    loadAdmin();
  });

  supabaseClient.auth.onAuthStateChange((event,session)=>{
    if(event==="SIGNED_IN"||event==="SIGNED_OUT")showSession(session);
  });

  supabaseClient.auth.getSession().then(({data})=>showSession(data.session));
});