import HOME from '../pages/home.jsx';
import CHECKIN from '../pages/checkin.jsx';
import ORGANIZATION from '../pages/organization.jsx';
import APPROVAL from '../pages/approval.jsx';
import TASKS from '../pages/tasks.jsx';
import NOTICES from '../pages/notices.jsx';
import PROFILE from '../pages/profile.jsx';
import LOGIN from '../pages/login.jsx';
import REGISTER from '../pages/register.jsx';
export const routers = [{
  id: "home",
  component: HOME
}, {
  id: "checkin",
  component: CHECKIN
}, {
  id: "organization",
  component: ORGANIZATION
}, {
  id: "approval",
  component: APPROVAL
}, {
  id: "tasks",
  component: TASKS
}, {
  id: "notices",
  component: NOTICES
}, {
  id: "profile",
  component: PROFILE
}, {
  id: "login",
  component: LOGIN
}, {
  id: "register",
  component: REGISTER
}]