/* Red Leafs Task Hub - team workflow */
const $=id=>document.getElementById(id);
const configured=window.APP_CONFIG?.SUPABASE_URL?.startsWith("https://")&&window.APP_CONFIG?.SUPABASE_ANON_KEY&&!window.APP_CONFIG.SUPABASE_ANON_KEY.startsWith("YOUR_");
const db=configured&&window.supabase?window.supabase.createClient(APP_CONFIG.SUPABASE_URL,APP_CONFIG.SUPABASE_ANON_KEY):null;
const AUTH_EMAIL_DOMAINS={rehan:"redleafssports.com"};
const authEmailForUsername=name=>{const username=String(name||"").trim().toLowerCase();return `${username}@${AUTH_EMAIL_DOMAINS[username]||"redleafs.com"}`};
const usernameFromUser=u=>(u?.email||"").split("@")[0];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateTime=d=>d?new Date(d).toLocaleString(undefined,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const dateOnly=d=>d?new Date(d+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}):"";
let user=null,profile=null,profiles=[],tasks=[],notes=[],activities=[],comments=[],busyTask=false,busyNote=false;
const isAdmin=()=>profile?.role==="admin";
const memberLabel=p=>p?.display_name||p?.username||(p?.email||"").split("@")[0]||"Team member";
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),3200)}
$("timezoneLabel").textContent="Your timezone: "+Intl.DateTimeFormat().resolvedOptions().timeZone;
$("todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});
function showApp(){$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");$("userLabel").textContent=profile?.username||usernameFromUser(user);loadAll()}
function showLogin(){$("appView").classList.add("hidden");$("loginView").classList.remove("hidden")}
async function authState(){if(!db){$("loginMessage").textContent="Setup required: configure Supabase in assets/js/config.js.";return}const {data}=await db.auth.getSession();if(data.session){user=data.session.user;await loadProfile();showApp()}}
async function loadProfile(){const r=await db.from("profiles").select("*").eq("id",user.id).single();if(r.error){toast("Could not load your team profile: "+r.error.message);profile={id:user.id,email:user.email,username:usernameFromUser(user),role:"manager"};return}profile=r.data}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!db)return;const username=$("username").value.trim().toLowerCase();if(!/^[a-z0-9._-]{3,32}$/.test(username)){$("loginMessage").textContent="Enter a valid username (3–32 characters).";return}const btn=$("loginForm").querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="Signing in…";const {data,error}=await db.auth.signInWithPassword({email:authEmailForUsername(username),password:$("password").value});btn.disabled=false;btn.textContent="Sign in";if(error){$("loginMessage").textContent=error.message;return}user=data.user;await loadProfile();showApp()});
$("logoutBtn").onclick=async()=>{if(db)await db.auth.signOut();user=null;profile=null;showLogin()};
function switchPage(page){const target=$(page+"Page");if(!target){toast("This section is not available.");return}document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));target.classList.remove("hidden");document.querySelectorAll(".nav-link[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));$("pageTitle").textContent=({mytasks:"My tasks"})[page]||page[0].toUpperCase()+page.slice(1);if(page==="mytasks")renderMyTasks();if(page==="activity")renderActivity()}
document.querySelectorAll(".nav-link[data-page]").forEach(b=>b.addEventListener("click",()=>switchPage(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>switchPage(b.dataset.goto)));
async function loadAll(){
 if(!db||!user)return;
 const results=await Promise.all([
  db.from("profiles").select("id,email,username,display_name,role").order("username"),
  db.from("tasks").select("*,task_attachments(*)").order("created_at",{ascending:false}),
  db.from("notes").select("*").order("updated_at",{ascending:false}),
  db.from("activity_log").select("*").order("created_at",{ascending:false}).limit(100),
  db.from("task_comments").select("*").order("created_at",{ascending:true})
 ]);
 const [pr,t,n,a,cm]=results;
 if(pr.error)toast("Team list: "+pr.error.message);else profiles=pr.data||[];
 if(t.error){toast("Tasks: "+t.error.message);tasks=[]}else tasks=t.data||[];
 if(n.error){toast("Notes: "+n.error.message);notes=[]}else notes=n.data||[];
 if(a.error){toast("Activity: "+a.error.message);activities=[]}else activities=a.data||[];
 if(cm.error){toast("Comments: "+cm.error.message);comments=[]}else comments=cm.data||[];
 for(const task of tasks){for(const file of(task.task_attachments||[])){const s=await db.storage.from("task-attachments").createSignedUrl(file.file_path,3600);file.file_url=s.data?.signedUrl||""}}
 populateAssignees();render();
}
function assigneeName(t){const p=profiles.find(x=>x.id===t.assignee_id)||profiles.find(x=>x.email===t.assignee_email);return p?memberLabel(p):(t.assignee_email||"Unassigned").split("@")[0]}
function canEditTask(t){return isAdmin()||t.created_by===user.id||t.assignee_id===user.id||t.assignee_email===user.email}
function taskCard(t){const files=t.task_attachments||[];return `<article class="task-card"><div><div class="task-title">${esc(t.title)}</div><p class="task-desc">${esc(t.description||"")}</p><div class="task-meta"><span class="pill priority-${esc(t.priority)}">${esc(t.priority)}</span><span class="pill status-${esc(t.status).replaceAll(" ","-")}">${esc(t.status)}</span><span class="pill">${esc(t.category)}</span><span class="pill">Assigned: ${esc(assigneeName(t))}</span><span class="pill">Created: ${esc(dateTime(t.created_at))}</span>${files.length?'<span class="pill">'+files.length+' attachment(s)</span>':""}</div></div><div>${canEditTask(t)?`<button class="small-btn" data-edit-task="${t.id}">View / update</button>`:""}</div></article>`}
function render(){const open=tasks.filter(t=>t.status!=="Completed"),blocked=tasks.filter(t=>t.status==="Blocked");$("totalCount").textContent=tasks.length;$("progressCount").textContent=tasks.filter(t=>t.status==="In Progress").length;$("attentionCount").textContent=blocked.length;$("completedCount").textContent=tasks.length-open.length;
 $("recentTasks").innerHTML=tasks.slice(0,5).map(taskCard).join("")||empty("No tasks yet. Create your first task.");
 const q=$("taskSearch").value.toLowerCase(),st=$("statusFilter").value,pr=$("priorityFilter").value;
 $("allTasks").innerHTML=tasks.filter(t=>(!q||(t.title+" "+(t.description||"")).toLowerCase().includes(q))&&(!st||t.status===st)&&(!pr||t.priority===pr)).map(taskCard).join("")||empty("No matching tasks.");
 renderMyTasks();
 $("notesGrid").innerHTML=notes.filter(n=>(!n.is_private||n.created_by===user.id)&&(!$("noteSearch").value||(`${n.title} ${n.body}`).toLowerCase().includes($("noteSearch").value.toLowerCase()))).map(n=>`<article class="note-card" data-edit-note="${n.id}"><span class="pill">${esc(n.category)}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>Updated ${esc(dateTime(n.updated_at))}</small></article>`).join("")||empty("No notes yet. Add a note to capture an idea or decision.");
 renderActivity();
 document.querySelectorAll("[data-edit-task]").forEach(b=>b.onclick=()=>openTask(tasks.find(t=>t.id===b.dataset.editTask)));
 document.querySelectorAll("[data-edit-note]").forEach(b=>b.onclick=()=>openNote(notes.find(n=>n.id===b.dataset.editNote)));
}
function renderMyTasks(){if(!$("myTasks"))return;const mine=tasks.filter(t=>t.assignee_id===user?.id||t.assignee_email===user?.email);$("myTasks").innerHTML=mine.map(taskCard).join("")||empty("No tasks are assigned to you yet.")}
function renderActivity(){if(!$("activityList"))return;$("activityList").innerHTML=activities.map(a=>`<div class="activity-item"><b>${esc(a.actor_email?.split("@")[0]||"Team member")}</b> ${esc(a.action)} <b>${esc(a.entity_title||"")}</b><small>${esc(dateTime(a.created_at))}</small></div>`).join("")||empty("No activity yet. Task creation, comments and updates will appear here.")}
function empty(s){return `<div class="task-card"><p>${esc(s)}</p></div>`}
["taskSearch","statusFilter","priorityFilter","noteSearch"].forEach(id=>$(id).addEventListener("input",render));
function populateAssignees(){const select=$("taskAssignee");const current=select.value;select.innerHTML='<option value="">Unassigned</option>'+profiles.map(p=>`<option value="${esc(p.id)}">${esc(memberLabel(p))} (${esc(p.role)})</option>`).join("");if(current)select.value=current}
function renderFiles(files){$("filePreview").innerHTML=files.map(f=>{const isImage=f.type?.startsWith("image/")||/\.(png|jpe?g|webp|gif)$/i.test(f.name);const url=f.url||URL.createObjectURL(f);return isImage?`<div class="preview-item"><img src="${url}" alt="${esc(f.name)}"><span>${esc(f.name)}</span></div>`:`<div class="preview-file">📄 ${esc(f.name)}</div>`}).join("")}
$("taskFiles").addEventListener("change",()=>{const files=[...$("taskFiles").files];if(files.some(f=>f.size>10*1024*1024)){toast("Each file must be 10 MB or smaller.");$("taskFiles").value="";renderFiles([]);return}renderFiles(files)});
function openTask(t){$("taskForm").reset();$("taskId").value=t?.id||"";$("taskModalTitle").textContent=t?"Task details / update":"Create task";$("taskTitle").value=t?.title||"";$("taskDescription").value=t?.description||"";$("taskAssignee").value=t?.assignee_id||"";$("taskCategory").value=t?.category||"General";$("taskPriority").value=t?.priority||"Medium";$("taskStatus").value=t?.status||"Not Started";$("taskComment").value="";$("createdAtInfo").textContent=t?"Created: "+dateTime(t.created_at):"Created automatically when you save.";populateAssignees();$("taskAssignee").value=t?.assignee_id||"";$("existingFiles").innerHTML=(t?.task_attachments||[]).map(f=>{const img=/\.(png|jpe?g|webp|gif)$/i.test(f.file_name);return img?`<div class="preview-item"><a href="${esc(f.file_url)}" target="_blank" rel="noopener"><img src="${esc(f.file_url)}" alt="${esc(f.file_name)}"></a><span>${esc(f.file_name)}</span></div>`:`<div><a href="${esc(f.file_url)}" target="_blank" rel="noopener">${esc(f.file_name)}</a></div>`}).join("");$("filePreview").innerHTML="";$("taskFiles").value="";$("taskTitle").disabled=!!t&&!canEditTask(t);$("taskDescription").disabled=!!t&&!canEditTask(t);$("taskAssignee").disabled=!!t&&!canEditTask(t);$("taskCategory").disabled=!!t&&!canEditTask(t);$("taskPriority").disabled=!!t&&!canEditTask(t);$("taskStatus").disabled=!!t&&!canEditTask(t);$("taskComment").disabled=!!t&&!canEditTask(t);$("taskFiles").disabled=!!t&&!canEditTask(t);$("saveTaskBtn").textContent=t?"Save update":"Create task";$("saveTaskBtn").disabled=!!t&&!canEditTask(t);const taskComments=comments.filter(c=>c.task_id===t?.id);$("taskCommentHistory").innerHTML=taskComments.map(c=>`<div class="comment-item"><b>${esc(c.author_email?.split("@")[0]||"Team member")}</b><p>${esc(c.body)}</p><small>${esc(dateTime(c.created_at))}</small></div>`).join("")||"";$("taskDialog").showModal()}
$("newTaskBtn").onclick=()=>openTask();
$("taskForm").addEventListener("submit",async e=>{e.preventDefault();if(busyTask)return;const id=$("taskId").value;const title=$("taskTitle").value.trim();if(!title){toast("Enter a task title.");return}busyTask=true;const btn=$("saveTaskBtn");btn.disabled=true;btn.textContent="Saving…";
 try{const assigneeId=$("taskAssignee").value||null;const assigned=profiles.find(p=>p.id===assigneeId);const payload={title,description:$("taskDescription").value,assignee_id:assigneeId,assignee_email:assigned?.email||null,category:$("taskCategory").value,priority:$("taskPriority").value,status:$("taskStatus").value,updated_at:new Date().toISOString()};let result;if(id)result=await db.from("tasks").update(payload).eq("id",id).select().single();else result=await db.from("tasks").insert({...payload,created_by:user.id}).select().single();if(result.error)throw result.error;const task=result.data;
  for(const file of [...$("taskFiles").files]){const path=`${user.id}/${task.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const up=await db.storage.from("task-attachments").upload(path,file);if(up.error)throw up.error;const ins=await db.from("task_attachments").insert({task_id:task.id,file_name:file.name,file_path:path,file_url:path,uploaded_by:user.id});if(ins.error)throw ins.error}
  const comment=$("taskComment").value.trim();if(comment){const cr=await db.from("task_comments").insert({task_id:task.id,body:comment,created_by:user.id,author_email:user.email});if(cr.error)throw cr.error}
  await logAction(id?"updated task":"created task",task.title,task.id);$("taskDialog").close();toast(id?"Task updated":"Task created");await loadAll();
 }catch(err){toast("Could not save: "+(err.message||"Please try again."));}finally{busyTask=false;btn.disabled=false;btn.textContent=$("taskId").value?"Save update":"Create task"}
});
function openNote(n){$("noteForm").reset();$("noteId").value=n?.id||"";$("noteModalTitle").textContent=n?"Edit note":"New note";$("noteTitle").value=n?.title||"";$("noteBody").value=n?.body||"";$("noteCategory").value=n?.category||"General";$("notePrivate").checked=!!n?.is_private;$("noteDialog").showModal()}
$("newNoteBtn").onclick=()=>openNote();
$("noteForm").addEventListener("submit",async e=>{e.preventDefault();if(busyNote)return;busyNote=true;const btn=$("saveNoteBtn");btn.disabled=true;btn.textContent="Saving…";const id=$("noteId").value,p={title:$("noteTitle").value.trim(),body:$("noteBody").value,category:$("noteCategory").value,is_private:$("notePrivate").checked,updated_at:new Date().toISOString()};if(!id)p.created_by=user.id;try{const r=id?await db.from("notes").update(p).eq("id",id):await db.from("notes").insert(p);if(r.error)throw r.error;await logAction(id?"updated note":"created note",p.title,id);$("noteDialog").close();toast("Note saved");await loadAll()}catch(err){toast("Could not save note: "+err.message)}finally{busyNote=false;btn.disabled=false;btn.textContent="Save note"}});
async function logAction(action,title,id){const r=await db.from("activity_log").insert({actor_id:user.id,actor_email:user.email,action,entity_title:title,entity_id:id});if(r.error)console.warn("Activity log:",r.error.message)}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
authState();
