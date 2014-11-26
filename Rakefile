projects = {
    "DDx" => "./DDx",    
    "Asteroids" => "./Asteroids", 
    "Scribble" => "./Scribble"
}

project = "HTML5 Samples"

task :setup do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake setup")
	end
end

task :install do	
end

task :build do
end

task :deploy do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake deploy")
	end
end

task :clean do 
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake clean")
	end	
end

task :stage do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake stage")
	end
end

task :stageclean do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake stageclean")
	end
end

task :package do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake package")
	end
end

task :packageclean do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake packageclean")
	end
end

task :cleanall do
	Dir.chdir(File.dirname(__FILE__))
	projects.each do |name, project|
		sh("cd #{project} && rake clean")
	end
	projects.each do |name, project|
		sh("cd #{project} && rake stageclean")
	end	
end

task :all do
end