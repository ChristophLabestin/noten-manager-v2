import folderIcon from "../assets/folder-black.svg";

export default function Navigation() {
  return (
    <div className="nav-bar">
      <div className="nav-menu">
        <div className="nav-menu-button">
          <img src={folderIcon} />
        </div>
        <div className="nav-menu-button">
          <img src={folderIcon} />
        </div>
        <div className="nav-add-button">+</div>
        <div className="nav-menu-button">
          <img src={folderIcon} />
        </div>
        <div className="nav-menu-button">
          <img src={folderIcon} />
        </div>
      </div>
    </div>
  );
}
