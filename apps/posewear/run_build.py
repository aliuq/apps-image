"""Run upstream PoseWear's `build.py` with the `fork` start method.

Upstream creates a module-level `ProcessPoolExecutor` and relies on the `fork`
start method that was the Linux default up to Python 3.13. Python 3.14 switched
the default to `forkserver`, whose bootstrap fails because the script has no
`if __name__ == "__main__"` guard. Force `fork` before executing the script and
keep its imports and relative file access rooted at the clone directory.

Usage (from the upstream clone): python path/to/run_build.py build.py
"""

import multiprocessing
import os
import runpy
import sys


def main() -> None:
    script = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "build.py")
    app_dir = os.path.dirname(script)

    os.chdir(app_dir)
    sys.path.insert(0, app_dir)
    sys.argv = [script, *sys.argv[2:]]

    # Must happen before build.py creates its process pool.
    multiprocessing.set_start_method("fork", force=True)
    runpy.run_path(script, run_name="__main__")


if __name__ == "__main__":
    main()
